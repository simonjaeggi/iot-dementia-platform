import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  accessCodes,
  changeUserRole,
  createAccessCode,
  deleteMe,
  deleteUser,
  login,
  logout,
  me,
  myPushId,
  register,
  revokeAccessCode,
  users,
} from "./auth.controller";
import { jwtOptions } from "./jwt.config";
import { requireAdmin } from "./auth.middleware";

export const authRoutes = new Hono();

authRoutes.use("/me", jwt(jwtOptions));
authRoutes.use("/me/pushId", jwt(jwtOptions));
authRoutes.use("/logout", jwt(jwtOptions));

authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.post("/register", register);
authRoutes.get("/me/pushId", myPushId);
authRoutes.get("/me", me);
authRoutes.delete("/me", deleteMe);

authRoutes.use("/accessCode", jwt(jwtOptions));
authRoutes.use("/accessCodes", jwt(jwtOptions));
authRoutes.use("/revokeAccessCode", jwt(jwtOptions));
authRoutes.use("/accessCode", requireAdmin());
authRoutes.use("/accessCodes", requireAdmin());
authRoutes.use("/revokeAccessCode", requireAdmin());


authRoutes.post("/accessCode", createAccessCode);
authRoutes.get("/accessCodes", accessCodes);
authRoutes.post("/revokeAccessCode", revokeAccessCode);


authRoutes.use("/users", jwt(jwtOptions));
authRoutes.use("/users", requireAdmin());
authRoutes.use("/deleteUser", jwt(jwtOptions));
authRoutes.use("/deleteUser", requireAdmin());
authRoutes.use("/updateUserRole", jwt(jwtOptions));
authRoutes.use("/updateUserRole", requireAdmin());

authRoutes.get("/users", users);
authRoutes.delete("/deleteUser", deleteUser)
authRoutes.put("/updateUserRole", changeUserRole)
