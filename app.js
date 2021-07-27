const bcrypt = require("bcrypt");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is Started at http://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

/**Registration */
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const searchUserQuery = `select * from user where username= "${username}"`;
  const result = await db.get(searchUserQuery);

  if (result === undefined && password.length >= 5) {
    const createUserQuery = `
     insert into 
        user (username, name, password, gender, location)
     values ('${username}','${name}',"${hashedPassword}","${gender}","${location}");`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else if (password.length <= 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

/**Login */
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const searchUserQuery = `select * from user where username= "${username}";`;
  const result = await db.get(searchUserQuery);

  if (result === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPassMatch = await bcrypt.compare(password, result.password);
    if (isPassMatch === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

/**Change-Password */
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const searchUserQuery = `select * from user where username= "${username}";`;
  const result = await db.get(searchUserQuery);

  if (result === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      result.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length >= 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePassQuery = `
                    update user set password= '${hashedPassword}' where username= "${username}";`;

        const user = await db.run(updatePassQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
