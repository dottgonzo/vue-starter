import dronepatch from "./patch/dronesql";

dronepatch(
    {
        origin: { host: "kernel.online", port: 3306 },
        auth: {
            password: "fHHffG4LFHfg463r763gKre",
            user: "root",
            database: "drone"
        },
        repo: "testrepo",
        gogs: {
            user: "string",
            password: "string"
        }
    }
);

