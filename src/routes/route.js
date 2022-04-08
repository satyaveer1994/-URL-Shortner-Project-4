const express = require("express");
const router = express.Router();
const urlController = require("../controller/urlController");

router.post("/url/shorten", urlController.urlShortener);
router.get("/:urlCode", urlController.geturl);

module.exports = router;
