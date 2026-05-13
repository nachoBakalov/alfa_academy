const AppError = require('../utils/AppError');
const { hashPassword } = require('../utils/password');
const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

const MANAGEABLE_ROLES = {
  super_admin: ['admin', 'coach', 'manager'],
  admin: ['coach'],
};

function getCurrentUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    isActive: user.is_active,
    role: user.role_code,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function ensureCanManageRole(actorRole, targetRole) {
  const allowedRoles = MANAGEABLE_ROLES[actorRole] || [];

  if (!allowedRoles.includes(targetRole)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanCreateRole(actorRole, newRole) {
  const allowedRoles = MANAGEABLE_ROLES[actorRole] || [];

  if (!allowedRoles.includes(newRole)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureNotSuperAdminTarget(targetUser) {
  if (targetUser.role_code === 'super_admin') {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureActorIsNotTarget(actor, targetUser) {
  if (actor.id === targetUser.id) {
    throw new AppError(403, 'Forbidden');
  }
}

async function listUsers(filters, actor) {
  ensureCanCreateRole(actor.role, 'coach');

  const users = await userRepository.listUsers(filters);
  const total = await userRepository.countUsers(filters);

  return {
    users: users.map((user) => {
      const safeUser = toSafeUser(user);
      return {
        id: safeUser.id,
        email: safeUser.email,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        phone: safeUser.phone,
        isActive: safeUser.isActive,
        role: safeUser.role,
        createdAt: safeUser.createdAt,
      };
    }),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getUserById(id, actor) {
  ensureCanCreateRole(actor.role, 'coach');

  const user = await userRepository.findByIdWithRole(id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return toSafeUser(user);
}

async function createUser(payload, context) {
  const actorRole = context.actor.role;
  ensureCanCreateRole(actorRole, payload.role);

  const normalizedEmail = normalizeEmail(payload.email);
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(409, 'Email already exists');
  }

  const role = await roleRepository.findByCode(payload.role);

  if (!role) {
    throw new AppError(400, 'Invalid role');
  }

  const passwordHash = await hashPassword(payload.password);

  const createdUser = await userRepository.createUser({
    roleId: role.id,
    email: normalizedEmail,
    passwordHash,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    isActive: true,
  });

  const userWithRole = await userRepository.findByIdWithRole(createdUser.id);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'user',
    entityId: userWithRole.id,
    action: 'user.created',
    metadata: {
      changedFields: ['email', 'firstName', 'lastName', 'phone', 'role', 'isActive'],
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const safeUser = toSafeUser(userWithRole);
  return {
    id: safeUser.id,
    email: safeUser.email,
    firstName: safeUser.firstName,
    lastName: safeUser.lastName,
    phone: safeUser.phone,
    isActive: safeUser.isActive,
    role: safeUser.role,
  };
}

async function updateUser(id, payload, context) {
  const actor = context.actor;
  const targetUser = await userRepository.findByIdWithRole(id);

  if (!targetUser) {
    throw new AppError(404, 'User not found');
  }

  ensureNotSuperAdminTarget(targetUser);
  ensureCanManageRole(actor.role, targetUser.role_code);

  if (
    payload.role !== undefined &&
    actor.id === targetUser.id &&
    payload.role !== targetUser.role_code
  ) {
    throw new AppError(403, 'Forbidden');
  }

  let roleId;
  let previousRole;
  let newRole;

  if (payload.role !== undefined) {
    ensureCanCreateRole(actor.role, payload.role);
    const role = await roleRepository.findByCode(payload.role);

    if (!role) {
      throw new AppError(400, 'Invalid role');
    }

    roleId = role.id;
    previousRole = targetUser.role_code;
    newRole = payload.role;
  }

  let normalizedEmail;

  if (payload.email !== undefined) {
    normalizedEmail = normalizeEmail(payload.email);
    const existingByEmail = await userRepository.findByEmail(normalizedEmail);

    if (existingByEmail && existingByEmail.id !== targetUser.id) {
      throw new AppError(409, 'Email already exists');
    }
  }

  const updatedUser = await userRepository.updateUser(id, {
    roleId,
    email: normalizedEmail,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
  });

  const metadata = {
    changedFields: Object.keys(payload),
  };

  if (previousRole !== undefined && newRole !== undefined) {
    metadata.previousRole = previousRole;
    metadata.newRole = newRole;
  }

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'user',
    entityId: updatedUser.id,
    action: 'user.updated',
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSafeUser(updatedUser);
}

async function resetUserPassword(id, payload, context) {
  const actor = context.actor;
  const targetUser = await userRepository.findByIdWithRole(id);

  if (!targetUser) {
    throw new AppError(404, 'User not found');
  }

  ensureNotSuperAdminTarget(targetUser);
  ensureCanManageRole(actor.role, targetUser.role_code);

  const passwordHash = await hashPassword(payload.newPassword);
  await userRepository.updatePassword(id, passwordHash);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'user',
    entityId: targetUser.id,
    action: 'user.password_reset',
    metadata: {
      changedFields: ['password'],
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return { message: 'Password updated successfully' };
}

async function updateUserStatus(id, payload, context) {
  const actor = context.actor;
  const targetUser = await userRepository.findByIdWithRole(id);

  if (!targetUser) {
    throw new AppError(404, 'User not found');
  }

  ensureActorIsNotTarget(actor, targetUser);
  ensureNotSuperAdminTarget(targetUser);
  ensureCanManageRole(actor.role, targetUser.role_code);

  const updatedUser = await userRepository.updateStatus(id, payload.isActive);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'user',
    entityId: updatedUser.id,
    action: 'user.status_updated',
    metadata: {
      changedFields: ['isActive'],
      previousIsActive: targetUser.is_active,
      newIsActive: updatedUser.is_active,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const safeUser = toSafeUser(updatedUser);
  return {
    id: safeUser.id,
    email: safeUser.email,
    firstName: safeUser.firstName,
    lastName: safeUser.lastName,
    phone: safeUser.phone,
    isActive: safeUser.isActive,
    role: safeUser.role,
  };
}

module.exports = {
  toSafeUser,
  normalizeEmail,
  ensureCanManageRole,
  ensureCanCreateRole,
  ensureNotSuperAdminTarget,
  ensureActorIsNotTarget,
  getCurrentUser,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  updateUserStatus,
};