import { Response } from 'express';
import mongoose from 'mongoose';
import CardioSession from '../models/CardioSession';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Helper to derive pace and speed consistently on the backend
 */
const derivePaceAndSpeed = (
  durationMinutes: number,
  distance: number | null | undefined,
  distanceUnit: string = 'km'
) => {
  if (
    distance === null ||
    distance === undefined ||
    !Number.isFinite(distance) ||
    distance <= 0 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return { paceMinutesPerUnit: null, speedPerHour: null };
  }

  const effectiveDistance = distanceUnit === 'm' ? distance / 1000 : distance;
  if (effectiveDistance <= 0) {
    return { paceMinutesPerUnit: null, speedPerHour: null };
  }

  const pace = Math.round((durationMinutes / effectiveDistance) * 100) / 100;
  const speed = Math.round(((effectiveDistance / durationMinutes) * 60) * 10) / 10;

  return {
    paceMinutesPerUnit: Number.isFinite(pace) ? pace : null,
    speedPerHour: Number.isFinite(speed) ? speed : null,
  };
};

/**
 * @desc    Get all cardio sessions for the authenticated user
 * @route   GET /api/cardio
 * @access  Private (JWT protected)
 */
export const getCardioSessions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { activityType, startDate, endDate, limit, page } = req.query;
    const filter: Record<string, any> = { userId: req.user._id };

    if (activityType && typeof activityType === 'string' && activityType !== 'all') {
      filter.activityType = activityType;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) filter.date.$lte = end;
      }
    }

    const totalCount = await CardioSession.countDocuments(filter);
    let query = CardioSession.find(filter).sort({ date: -1, createdAt: -1 });

    const pageNum = page && !isNaN(Number(page)) ? Math.max(1, Number(page)) : 1;
    const limitNum = limit && !isNaN(Number(limit)) ? Number(limit) : 0;

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const sessions = await query;
    res.status(200).json({
      count: sessions.length,
      totalCount,
      page: pageNum,
      totalPages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1,
      sessions,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cardio sessions', details: error.message });
  }
};

/**
 * @desc    Get single cardio session by ID
 * @route   GET /api/cardio/:id
 * @access  Private (JWT protected)
 */
export const getCardioSessionById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    const session = await CardioSession.findById(id);
    if (!session) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this cardio session' });
      return;
    }

    res.status(200).json({ session });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cardio session', details: error.message });
  }
};

/**
 * @desc    Create a new cardio session
 * @route   POST /api/cardio
 * @access  Private (JWT protected)
 */
export const createCardioSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      clientSessionId,
      activityType,
      customActivityName,
      date,
      durationMinutes,
      distance,
      distanceUnit,
      averageHeartRate,
      maxHeartRate,
      caloriesBurned,
      notes,
    } = req.body;

    if (!activityType || typeof activityType !== 'string') {
      res.status(400).json({ error: 'Activity type is required' });
      return;
    }

    const validActivities = [
      'running',
      'walking',
      'cycling',
      'treadmill',
      'elliptical',
      'rowing',
      'stair_climber',
      'other',
    ];
    if (!validActivities.includes(activityType)) {
      res.status(400).json({ error: `Invalid activity type: ${activityType}` });
      return;
    }

    const durationNum = Number(durationMinutes);
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      res.status(400).json({ error: 'Duration in minutes must be a positive number' });
      return;
    }

    // Idempotency check: prevent duplicate submissions
    if (clientSessionId && typeof clientSessionId === 'string' && clientSessionId.trim()) {
      const existing = await CardioSession.findOne({
        userId: req.user._id,
        clientSessionId: clientSessionId.trim(),
      });

      if (existing) {
        res.status(200).json({
          message: 'Cardio session already saved',
          session: existing,
          deduplicated: true,
        });
        return;
      }
    }

    const distNum =
      distance !== null && distance !== undefined && distance !== ''
        ? Number(distance)
        : null;

    const unit = ['km', 'mi', 'm'].includes(distanceUnit) ? distanceUnit : 'km';
    const { paceMinutesPerUnit, speedPerHour } = derivePaceAndSpeed(durationNum, distNum, unit);

    let sessionDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        sessionDate = parsed;
      }
    }

    const newSession = await CardioSession.create({
      userId: req.user._id, // Strict authentication assignment
      clientSessionId: clientSessionId ? String(clientSessionId).trim() : undefined,
      activityType,
      customActivityName: customActivityName ? String(customActivityName).trim() : undefined,
      date: sessionDate,
      durationMinutes: durationNum,
      distance: distNum !== null && distNum >= 0 ? distNum : null,
      distanceUnit: unit,
      paceMinutesPerUnit,
      speedPerHour,
      averageHeartRate:
        averageHeartRate !== null && averageHeartRate !== undefined && averageHeartRate !== ''
          ? Number(averageHeartRate)
          : null,
      maxHeartRate:
        maxHeartRate !== null && maxHeartRate !== undefined && maxHeartRate !== ''
          ? Number(maxHeartRate)
          : null,
      caloriesBurned:
        caloriesBurned !== null && caloriesBurned !== undefined && caloriesBurned !== ''
          ? Number(caloriesBurned)
          : null,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    res.status(201).json({
      message: 'Cardio session created successfully',
      session: newSession,
    });
  } catch (error: any) {
    if (error.code === 11000 && req.user) {
      // Race condition duplicate recovery
      const duplicateClientSessionId = req.body?.clientSessionId;
      if (duplicateClientSessionId) {
        const existing = await CardioSession.findOne({
          userId: req.user._id,
          clientSessionId: String(duplicateClientSessionId).trim(),
        });
        if (existing) {
          res.status(200).json({
            message: 'Cardio session already saved',
            session: existing,
            deduplicated: true,
          });
          return;
        }
      }
    }
    res.status(500).json({ error: 'Failed to create cardio session', details: error.message });
  }
};

/**
 * @desc    Update an existing cardio session
 * @route   PUT /api/cardio/:id
 * @access  Private (JWT protected)
 */
export const updateCardioSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    const session = await CardioSession.findById(id);
    if (!session) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this cardio session' });
      return;
    }

    const {
      activityType,
      customActivityName,
      date,
      durationMinutes,
      distance,
      distanceUnit,
      averageHeartRate,
      maxHeartRate,
      caloriesBurned,
      notes,
    } = req.body;

    if (activityType !== undefined) {
      const validActivities = [
        'running',
        'walking',
        'cycling',
        'treadmill',
        'elliptical',
        'rowing',
        'stair_climber',
        'other',
      ];
      if (!validActivities.includes(activityType)) {
        res.status(400).json({ error: `Invalid activity type: ${activityType}` });
        return;
      }
      session.activityType = activityType;
    }

    if (customActivityName !== undefined) {
      session.customActivityName = customActivityName ? String(customActivityName).trim() : undefined;
    }

    if (date !== undefined) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        session.date = parsed;
      } else {
        res.status(400).json({ error: 'Invalid date provided' });
        return;
      }
    }

    if (durationMinutes !== undefined) {
      const durationNum = Number(durationMinutes);
      if (!Number.isFinite(durationNum) || durationNum <= 0) {
        res.status(400).json({ error: 'Duration in minutes must be a positive number' });
        return;
      }
      session.durationMinutes = durationNum;
    }

    if (distance !== undefined) {
      session.distance =
        distance !== null && distance !== '' ? Math.max(0, Number(distance)) : null;
    }

    if (distanceUnit !== undefined) {
      session.distanceUnit = ['km', 'mi', 'm'].includes(distanceUnit) ? distanceUnit : 'km';
    }

    const { paceMinutesPerUnit, speedPerHour } = derivePaceAndSpeed(
      session.durationMinutes,
      session.distance,
      session.distanceUnit
    );
    session.paceMinutesPerUnit = paceMinutesPerUnit;
    session.speedPerHour = speedPerHour;

    if (averageHeartRate !== undefined) {
      session.averageHeartRate =
        averageHeartRate !== null && averageHeartRate !== '' ? Number(averageHeartRate) : null;
    }

    if (maxHeartRate !== undefined) {
      session.maxHeartRate =
        maxHeartRate !== null && maxHeartRate !== '' ? Number(maxHeartRate) : null;
    }

    if (caloriesBurned !== undefined) {
      session.caloriesBurned =
        caloriesBurned !== null && caloriesBurned !== '' ? Math.max(0, Number(caloriesBurned)) : null;
    }

    if (notes !== undefined) {
      session.notes = typeof notes === 'string' ? notes.trim() : '';
    }

    const updatedSession = await session.save();
    res.status(200).json({
      message: 'Cardio session updated successfully',
      session: updatedSession,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update cardio session', details: error.message });
  }
};

/**
 * @desc    Delete a cardio session
 * @route   DELETE /api/cardio/:id
 * @access  Private (JWT protected)
 */
export const deleteCardioSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    const session = await CardioSession.findById(id);
    if (!session) {
      res.status(404).json({ error: 'Cardio session not found' });
      return;
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this cardio session' });
      return;
    }

    await session.deleteOne();
    res.status(200).json({ message: 'Cardio session deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete cardio session', details: error.message });
  }
};
