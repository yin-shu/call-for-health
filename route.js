const Router = require("koa-router");
const passport = require("koa-passport");
const ctrl = require("./controllers");
const config = require("./config.json");

let router = new Router();

function authRequired(ctx, next) {
  if (ctx.isAuthenticated()) {
    return next();
  } else {
    ctx.body = { status: 403, error: 'auth required'};
  }
}

function jwtAuthRequired(ctx, next) {
  return passport.authenticate('jwt', {session: false})(ctx, next)
}

function kycRequired(ctx, next) {
  if (!config.faceid.enabled) {
    return next()
  }
  if (ctx.state.user) {
    if (ctx.state.user.kycState === 1) {
      return next();
    } else {
      ctx.body = { status: 403, error: 'kyc required'};
    }
  } else {
    ctx.body = { status: 403, error: 'auth required'};
  }
}

function isVolunteer(ctx, next) {
  if (ctx.state.user && ctx.state.user.role === 'VOLUNTEER') {
    return next();
  } else {
    ctx.body = { status: 403, error: 'you must be a volunteer'};
  }
}

module.exports = {
  init: function(app) {
    app.use(async function(ctx, next) {
      ctx.state.name = "call_for_health";
      await next();
    });
    router
      // auth
      .get ("/auth/weibo", ctrl.account.authWeibo)
      .get ("/auth/weibo/callback", ctrl.account.authWeiboCallback)
      .get ("/auth/weibo/done", authRequired, ctrl.account.authWeiboDone)

      // kyc
      .post("/kyc/faceid/start", jwtAuthRequired, ctrl.account.kycFaceIdStart)
      // - i do not use face id's callback actually, they are not stable.
      .post("/kyc/faceid/callback", ctrl.account.kycFaceIdCallback)
      .post("/kyc/faceid/notify_callback", ctrl.account.kycFaceIdNotifyCallback)

      // requirements
      .get ("/requirements", ctrl.requirement.list)
      .get ("/requirements/:id", ctrl.requirement.single)
      .post("/requirements", jwtAuthRequired, kycRequired, ctrl.requirement.handleCreate)
      .put ("/requirements/:id/status", jwtAuthRequired, kycRequired, isVolunteer, ctrl.requirement.handleUpdateStatus)

      // products api
      // @TODO: create and update
      // .get ("/products", ctrl.products.list)

      .get("/_hc", ctx => {
        ctx.body = "ok";
      });
    app.use(router.routes());
  }
};
