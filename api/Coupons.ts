import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const prismaAny: any = prisma;
const authorize = require('../middleware/auth');

// List coupons
router.get('/', authorize, async (req: any, res: any) => {
  try {
    const coupons = await prismaAny.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', status: 500 });
  }
});

// Create coupon
router.post('/', authorize, async (req: any, res: any) => {
  try {
    const { code, type, value, isActive, startsAt, endsAt, usageLimit, perUserLimit, minSubtotal } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ message: 'code, type, value are required', status: 400 });
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'type must be percentage or fixed', status: 400 });
    }
    const coupon = await prismaAny.coupon.create({
      data: {
        code: String(code).trim().toUpperCase(),
        type,
        value: Number(value),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: perUserLimit ? Number(perUserLimit) : null,
        minSubtotal: minSubtotal ? Number(minSubtotal) : null,
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', status: 500 });
  }
});

// Update coupon
router.put('/:id', authorize, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { code, type, value, isActive, startsAt, endsAt, usageLimit, perUserLimit, minSubtotal } = req.body;
    const coupon = await prismaAny.coupon.update({
      where: { id: Number(id) },
      data: {
        ...(code !== undefined ? { code: String(code).trim().toUpperCase() } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(value !== undefined ? { value: Number(value) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        usageLimit: usageLimit !== undefined ? (usageLimit === null ? null : Number(usageLimit)) : undefined,
        perUserLimit: perUserLimit !== undefined ? (perUserLimit === null ? null : Number(perUserLimit)) : undefined,
        minSubtotal: minSubtotal !== undefined ? (minSubtotal === null ? null : Number(minSubtotal)) : undefined,
      },
    });
    res.json(coupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', status: 500 });
  }
});

// Delete coupon
router.delete('/:id', authorize, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prismaAny.coupon.delete({ where: { id: Number(id) } });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', status: 500 });
  }
});

// Validate coupon and compute discount
router.post('/validate', async (req: any, res: any) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || subtotal === undefined) {
      return res.status(400).json({ message: 'code and subtotal are required', status: 400 });
    }
    const coupon = await prismaAny.coupon.findUnique({ where: { code: String(code).trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ message: 'Invalid coupon', status: 404 });
    }
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return res.status(400).json({ message: 'Coupon not active yet', status: 400 });
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      return res.status(400).json({ message: 'Coupon expired', status: 400 });
    }
    const subtotalNum = Number(subtotal);
    if (coupon.minSubtotal && subtotalNum < coupon.minSubtotal) {
      return res.status(400).json({ message: `Minimum subtotal is ${coupon.minSubtotal}`, status: 400 });
    }
    // Usage limits
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      const used = await prismaAny.couponRedemption.count({ where: { couponId: coupon.id } });
      if (used >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit reached', status: 400 });
      }
    }
    if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined && req.session?.user_id) {
      const perUserUsed = await prismaAny.couponRedemption.count({ where: { couponId: coupon.id, userId: req.session.user_id } });
      if (perUserUsed >= coupon.perUserLimit) {
        return res.status(400).json({ message: 'You have already used this coupon', status: 400 });
      }
    }
    const discount = coupon.type === 'percentage' ? Math.round((subtotalNum * coupon.value) * 100) / 100 : Math.min(coupon.value, subtotalNum);
    const total = Math.max(0, Math.round((subtotalNum - discount) * 100) / 100);
    res.json({ valid: true, coupon, discount, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', status: 500 });
  }
});

export default router;


