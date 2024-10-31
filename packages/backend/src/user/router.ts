import { AuthenticationMiddleware, LoginProtectedRoute } from "@/middleware/auth";
import { sendEmailRateLimiter } from "@/middleware/rate-limit/email";
import { strictGetReqRateLimiter } from "@/middleware/rate-limit/get-req";
import { addInvalidAuthAttempt } from "@/middleware/rate-limit/invalid-auth-attempt";
import { critModifyReqRateLimiter } from "@/middleware/rate-limit/modify-req";
import { REQ_BODY_NAMESPACE } from "@/types/namespaces";
import { HTTP_STATUS, invalidReqestResponse, serverErrorResponse } from "@/utils/http";
import {
    profileUpdateFormSchema,
    removeAccountPasswordFormSchema,
    sendAccoutPasswordChangeLinkFormSchema,
    setNewPasswordFormSchema,
} from "@shared/schemas/settings";
import { parseValueToSchema } from "@shared/schemas/utils";
import {
    addNewPassword_ConfirmationEmail,
    changeUserPassword,
    confirmAccountDeletion,
    confirmAddingNewPassword,
    deleteConfirmationActionCode,
    deleteUserAccountConfirmationEmail,
    getConfirmActionTypeFromCode,
    removeAccountPassword,
    sendAccountPasswordChangeLink,
} from "@src/user/controllers/account";
import { getAllVisibleProjects, getUserProfileData, updateUserProfile } from "@src/user/controllers/profile";
import { type Context, Hono } from "hono";
import { getUserFromCtx } from "../auth/helpers/session";

const userRouter = new Hono();
userRouter.use(AuthenticationMiddleware);

userRouter.get("/", strictGetReqRateLimiter, user_get);
userRouter.get("/:slug", strictGetReqRateLimiter, user_get);
userRouter.get("/:slug/projects", strictGetReqRateLimiter, userProjects_get);
userRouter.patch("/", critModifyReqRateLimiter, LoginProtectedRoute, user_patch);
userRouter.delete("/", critModifyReqRateLimiter, user_delete);
userRouter.post("/delete-account", sendEmailRateLimiter, LoginProtectedRoute, deleteAccountConfirmation_post);

userRouter.post("/confirmation-action", strictGetReqRateLimiter, userConfirmationAction_post);
userRouter.delete("/confirmation-action", critModifyReqRateLimiter, userConfirmationAction_delete);

userRouter.post("/password", sendEmailRateLimiter, LoginProtectedRoute, addPasswordConfirmation_post);
userRouter.put("/password", critModifyReqRateLimiter, addPasswordConfirmation_put);
userRouter.delete("/password", critModifyReqRateLimiter, LoginProtectedRoute, userPassword_delete);

userRouter.post("/change-password", sendEmailRateLimiter, changePasswordConfirmationEmail_post);
userRouter.patch("/password", critModifyReqRateLimiter, userPassword_patch);

// Get currently logged in user
async function user_get(ctx: Context) {
    try {
        const userSession = getUserFromCtx(ctx);
        const slug = ctx.req.param("slug") || userSession?.id;
        if (!slug) return invalidReqestResponse(ctx);

        const res = await getUserProfileData(slug);
        return ctx.json(res.data, res.status);
    } catch (error) {
        console.error(error);
        return serverErrorResponse(ctx);
    }
}

// Get all projects of the user
async function userProjects_get(ctx: Context) {
    try {
        const slug = ctx.req.param("slug");
        const listedProjectsOnly = ctx.req.query("listedOnly") === "true";
        if (!slug) return invalidReqestResponse(ctx);
        const userSession = getUserFromCtx(ctx);

        const res = await getAllVisibleProjects(userSession, slug, listedProjectsOnly);
        return ctx.json(res.data, res.status);
    } catch (error) {
        console.error(error);
        return serverErrorResponse(ctx);
    }
}

// Update user profile
async function user_patch(ctx: Context) {
    try {
        const userSession = getUserFromCtx(ctx);
        if (!userSession) return invalidReqestResponse(ctx);

        const { data, error } = await parseValueToSchema(profileUpdateFormSchema, ctx.get(REQ_BODY_NAMESPACE));
        if (error || !data) {
            return ctx.json({ success: false, message: error }, HTTP_STATUS.BAD_REQUEST);
        }
        const res = await updateUserProfile(userSession, data);
        return ctx.json(res.data, res.status);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Delete user account
async function user_delete(ctx: Context) {
    try {
        const code = ctx.get(REQ_BODY_NAMESPACE)?.code;
        if (!code) {
            await addInvalidAuthAttempt(ctx);
            return invalidReqestResponse(ctx);
        }

        return await confirmAccountDeletion(ctx, code);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Get confirmation action type
async function userConfirmationAction_post(ctx: Context) {
    try {
        const code = ctx.get(REQ_BODY_NAMESPACE)?.code;
        if (!code) {
            return ctx.json({ success: false }, HTTP_STATUS.BAD_REQUEST);
        }
        return await getConfirmActionTypeFromCode(ctx, code);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Delete confirmation action code
async function userConfirmationAction_delete(ctx: Context) {
    try {
        const code = ctx.get(REQ_BODY_NAMESPACE)?.code;
        if (!code) {
            return ctx.json({ success: false }, HTTP_STATUS.BAD_REQUEST);
        }
        return await deleteConfirmationActionCode(ctx, code);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Send new password confirmation email
async function addPasswordConfirmation_post(ctx: Context) {
    try {
        const { data, error } = await parseValueToSchema(setNewPasswordFormSchema, ctx.get(REQ_BODY_NAMESPACE));
        if (error || !data) {
            return ctx.json({ success: false, message: error }, HTTP_STATUS.BAD_REQUEST);
        }
        const res = await addNewPassword_ConfirmationEmail(ctx, data);
        return ctx.json(res.data, res.status);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Add the new password
async function addPasswordConfirmation_put(ctx: Context) {
    try {
        const code = ctx.get(REQ_BODY_NAMESPACE)?.code;
        if (!code) return ctx.json({ success: false }, HTTP_STATUS.BAD_REQUEST);

        return await confirmAddingNewPassword(ctx, code);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Remove user password
async function userPassword_delete(ctx: Context) {
    try {
        const { data, error } = await parseValueToSchema(removeAccountPasswordFormSchema, ctx.get(REQ_BODY_NAMESPACE));
        if (error || !data) {
            return ctx.json({ success: false, message: error }, HTTP_STATUS.BAD_REQUEST);
        }

        const userSession = getUserFromCtx(ctx);
        if (!userSession || !userSession?.password) return ctx.json({}, HTTP_STATUS.BAD_REQUEST);

        return await removeAccountPassword(ctx, userSession, data);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Send change password confirmation email
async function changePasswordConfirmationEmail_post(ctx: Context) {
    try {
        const { data, error } = await parseValueToSchema(sendAccoutPasswordChangeLinkFormSchema, ctx.get(REQ_BODY_NAMESPACE));
        if (error || !data) {
            return ctx.json({ success: false, message: error }, HTTP_STATUS.BAD_REQUEST);
        }
        return await sendAccountPasswordChangeLink(ctx, data);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Change user password
async function userPassword_patch(ctx: Context) {
    try {
        const { data, error } = await parseValueToSchema(setNewPasswordFormSchema, ctx.get(REQ_BODY_NAMESPACE));
        if (error || !data) {
            return ctx.json({ success: false, message: error }, HTTP_STATUS.BAD_REQUEST);
        }
        const code = ctx.get(REQ_BODY_NAMESPACE)?.code;
        if (!code) {
            return invalidReqestResponse(ctx);
        }
        return await changeUserPassword(ctx, code, data);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

// Send delete account confirmation email
async function deleteAccountConfirmation_post(ctx: Context) {
    try {
        const userSession = getUserFromCtx(ctx);
        if (!userSession?.id) {
            await addInvalidAuthAttempt(ctx);
            return invalidReqestResponse(ctx);
        }

        return await deleteUserAccountConfirmationEmail(ctx, userSession);
    } catch (err) {
        console.error(err);
        return serverErrorResponse(ctx);
    }
}

export default userRouter;