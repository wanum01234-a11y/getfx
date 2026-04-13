import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mt5Router from "./mt5";
import whatsappAutomationRouter from "./whatsapp-automation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mt5Router);
router.use(whatsappAutomationRouter);

export default router;
