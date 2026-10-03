// Expense Tracker - backend (Express API + PostgreSQL)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Endpoints you need to build:
//   GET    /api/expenses        return all expenses

app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, amount::float8, to_char(date, 'YYYY-MM-DD') as date, category FROM expenses ORDER BY date DESC",
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching expenses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//   GET    /api/expenses/:id    return one expense (404 if not found)

app.get("/api/expenses/:id", async (req, res) => {
  const id = req.params.id;

  if (isNaN(id)) {
    return res.status(404).json({
      message: "expense not found (Invalid ID format)",
    });
  }

  try {
    const result = await pool.query(
      "SELECT id, title, amount::float8, to_char(date, 'YYYY-MM-DD') as date, category FROM expenses WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "expense not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)

app.post("/api/expenses", async (req, res) => {
  const { title, amount, category, date } = req.body;

  if (!title || !amount || amount <= 0) {
    return res.status(400).json({
      error: "Invalid data: Please provide a valid title and amount.",
    });
  }

  try {
    const query = `
            INSERT INTO expenses (title, amount, category, date) 
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, amount::float8, to_char(date, 'YYYY-MM-DD') as date, category
        `;

    const values = [title, amount, category || "Other", date || new Date()];

    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding expense:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)

app.put("/api/expenses/:id", async (req, res) => {
  const id = req.params.id;
  const { title, amount, category, date } = req.body;

  if (isNaN(id)) {
    return res
      .status(404)
      .json({ message: "Expense not found (Invalid ID format)" });
  }

  if (!title || !amount || amount <= 0) {
    return res.status(400).json({
      error: "Invalid data: Please provide a valid title and amount.",
    });
  }

  try {
    const query = `
            UPDATE expenses 
            SET title = $1, amount = $2, category = $3, date = $4 
            WHERE id = $5 
            RETURNING id, title, amount::float8, to_char(date, 'YYYY-MM-DD') as date, category
        `;
    const values = [title, amount, category || "Other", date || new Date(), id];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating expense:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//   DELETE /api/expenses/:id    delete an expense (200, or 404)

app.delete("/api/expenses/:id", async (req, res) => {
  const id = req.params.id;

  if (isNaN(id)) {
    return res
      .status(404)
      .json({ message: "Expense not found (Invalid ID format)" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 RETURNING id, title, amount::float8, to_char(date, 'YYYY-MM-DD') as date, category",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({
      message: "Expense deleted successfully",
      deletedExpense: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting expense:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
