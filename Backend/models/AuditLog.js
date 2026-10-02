const mongoose = require('mongoose');

/**
 * Records sensitive admin actions (currently: granting the admin role to an
 * account) so there's a durable, queryable trail of who did what and when -
 * separate from the operational logger, which rotates/isn't queryable by
 * actor/target the way a DB collection is.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['grant_admin_role'],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rolesBefore: [{ type: String }],
    rolesAfter: [{ type: String }],
  },
  { timestamps: true }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
