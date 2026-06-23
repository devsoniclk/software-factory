"""Referrals & credits router."""
import json
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import ReferralCode, UserCredits, CreditTransaction, uid, now_iso

router = APIRouter(prefix="/referrals", tags=["referrals"])

# Default user for now (no auth yet)
DEFAULT_USER = "local-user"

TIER_THRESHOLDS = {
    "seed": 0,
    "sprout": 3,
    "tree": 10,
    "forest": 25,
}
TIER_REWARDS = {
    "seed": 50,
    "sprout": 75,
    "tree": 100,
    "forest": 150,
}


def _generate_code() -> str:
    return "1024-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def _ensure_credits(db: AsyncSession, user_id: str) -> UserCredits:
    result = await db.execute(select(UserCredits).where(UserCredits.user_id == user_id))
    credits = result.scalar_one_or_none()
    if not credits:
        credits = UserCredits(user_id=user_id, balance=100, lifetime_earned=100)
        db.add(credits)
        await db.commit()
        await db.refresh(credits)
    return credits


@router.get("/my-code")
async def get_my_code(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReferralCode).where(ReferralCode.user_id == DEFAULT_USER))
    code_obj = result.scalar_one_or_none()
    if not code_obj:
        code_obj = ReferralCode(
            id=uid(),
            user_id=DEFAULT_USER,
            code=_generate_code(),
            url=f"https://1024studio.ai/r/{_generate_code()}",
        )
        db.add(code_obj)
        await db.commit()
        await db.refresh(code_obj)
    return {"code": code_obj.code, "url": code_obj.url, "uses": code_obj.uses}


@router.post("/redeem/{code}")
async def redeem_code(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReferralCode).where(ReferralCode.code == code))
    code_obj = result.scalar_one_or_none()
    if not code_obj:
        raise HTTPException(status_code=404, detail="Referral code not found")
    if code_obj.user_id == DEFAULT_USER:
        raise HTTPException(status_code=400, detail="Cannot redeem your own code")

    # Increment uses
    code_obj.uses += 1

    # Reward referrer
    await _ensure_credits(db, code_obj.user_id)
    referrer_credits = (await db.execute(select(UserCredits).where(UserCredits.user_id == code_obj.user_id))).scalar_one()
    referrer_credits.balance += 50
    referrer_credits.lifetime_earned += 50
    referrer_credits.referral_count += 1

    # Update tier
    for tier_name in sorted(TIER_THRESHOLDS.keys(), key=lambda t: TIER_THRESHOLDS[t], reverse=True):
        if referrer_credits.referral_count >= TIER_THRESHOLDS[tier_name]:
            referrer_credits.referral_tier = tier_name
            break

    # Reward redeemer
    await _ensure_credits(db, DEFAULT_USER)
    redeemer_credits = (await db.execute(select(UserCredits).where(UserCredits.user_id == DEFAULT_USER))).scalar_one()
    redeemer_credits.balance += 25
    redeemer_credits.lifetime_earned += 25

    # Log transactions
    for uid_val, amount, reason in [
        (code_obj.user_id, 50, f"Referral bonus: code {code} redeemed"),
        (DEFAULT_USER, 25, f"Redeemed referral code: {code}"),
    ]:
        txn = CreditTransaction(id=uid(), user_id=uid_val, amount=amount, reason=reason, reference_id=code)
        db.add(txn)

    await db.commit()
    return {"redeemed": True, "bonus": 25, "referrer_bonus": 50}


@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReferralCode).order_by(ReferralCode.uses.desc()).limit(20)
    )
    codes = result.scalars().all()
    return [
        {"user_id": c.user_id, "code": c.code, "uses": c.uses}
        for c in codes
    ]


@router.get("/my-stats")
async def my_stats(db: AsyncSession = Depends(get_db)):
    credits = await _ensure_credits(db, DEFAULT_USER)
    result = await db.execute(
        select(CreditTransaction).where(CreditTransaction.user_id == DEFAULT_USER).order_by(CreditTransaction.created_at.desc()).limit(20)
    )
    txns = result.scalars().all()
    return {
        "balance": credits.balance,
        "lifetime_earned": credits.lifetime_earned,
        "lifetime_spent": credits.lifetime_spent,
        "tier": credits.referral_tier,
        "referral_count": credits.referral_count,
        "recent_transactions": [
            {"amount": t.amount, "reason": t.reason, "created_at": t.created_at}
            for t in txns
        ],
    }
