const prisma = require("../lib/prisma");

const ACCESS_RANK = {
  VIEW: 1,
  EDIT: 2,
  OWNER: 3
};

function hasAccess(currentLevel, requiredLevel) {
  return ACCESS_RANK[currentLevel] >= ACCESS_RANK[requiredLevel];
}

function requireFormAccess(requiredLevel = "VIEW") {
  return async (req, res, next) => {
    const formId =
      req.params.id || req.params.formId || (req.query.formId ? String(req.query.formId) : null);

    if (!formId) {
      return res.status(400).json({ message: "Form ID is required for this operation" });
    }

    const permission = await prisma.formPermission.findUnique({
      where: {
        userId_formConnectionId: {
          userId: req.user.id,
          formConnectionId: formId
        }
      }
    });

    if (!permission || !hasAccess(permission.accessLevel, requiredLevel)) {
      return res.status(403).json({
        message: `You need ${requiredLevel.toLowerCase()} access to this form`
      });
    }

    req.formPermission = permission;
    return next();
  };
}

module.exports = {
  requireFormAccess,
  hasAccess
};
