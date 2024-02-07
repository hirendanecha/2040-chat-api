const express = require("express");
const router = express.Router();
const utilsController = require("../controllers/utils.controller");
const uploadFileMiddleware = require("../middleware/upload");

router.post("/upload", utilsController.fileupload);
router.post(
  "/image-upload",
  uploadFileMiddleware.single("file"),
  utilsController.uploadVideo
);
// router.post("/upload2", utilsController.fileupload2);
router.get("/files/:folder/:id", utilsController.getFiles);
router.get("/download/partner/:name", utilsController.downloadPartner);
router.get("/download/:folder/:id/:name", utilsController.download);
router.get("/:folder/:id/:filename", utilsController.readFile);

module.exports = router;
