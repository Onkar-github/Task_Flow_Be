import { Router } from "express";

import { register } from "./auth.controller.js";
import { login } from "./login.controller.js";
import { getCurrentUser } from "./me.controller.js";
import { logout } from "./logout.controller.js";
import { requireAuth } from "./auth.middleware.js";


const router = Router();

router.post("/register", register);
router.post("/login", login);

// Protected route.
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);

export default router;