import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mt5Router from "./mt5";
import pipSettingsRouter from "./pip-settings";
import settingsRouter from "./settings";
import signalsTemplatesRouter from "./signals-templates";
import whatsappAutomationRouter from "./whatsapp-automation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mt5Router);
router.use(pipSettingsRouter);
router.use(settingsRouter);
router.use(signalsTemplatesRouter);
router.use(whatsappAutomationRouter);

export default router;
