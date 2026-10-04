const supabase = require("../config/supabase");

const auditLog = (actionExtractor) => {
  return async (req, res, next) => {
    try {
      res.on("finish", async () => {
        try {
          const actionData = actionExtractor(req, res);

          if (!actionData) return;

          const ip =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            req.ip;

          await supabase.from("audit_logs").insert([
            {
              user_id: req.user?.id || null,
              document_id: actionData.documentId || null,
              action: actionData.action,
              ip_address: ip,
            },
          ]);

          console.log("AUDIT LOGGED ✅", actionData.action);
        } catch (err) {
          console.error("AUDIT ERROR:", err.message);
        }
      });

      next();
    } catch (err) {
      next();
    }
  };
};

module.exports = auditLog;
