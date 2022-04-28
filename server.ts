import express from "express";

import * as path from "path";

const DIST_DIR = path.join(__dirname, "dist");
const PORT = 3033;
const app = express();

app.use(express.static(DIST_DIR));

app.get("*", (req: any, res: { sendFile: (arg0: string) => void }) => {
	res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT);
