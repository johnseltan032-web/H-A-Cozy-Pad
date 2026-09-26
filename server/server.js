const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

const DIFY_API_URL =
  process.env.DIFY_API_URL || "https://api.dify.ai/v1";

const DIFY_API_KEY = process.env.DIFY_API_KEY;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "H&A Cozy Pad chatbot server is running.",
  });
});


// ========================================
// GET ALL FAQs
// ========================================

app.get("/api/faqs", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.faq_id,
        f.category_id,
        c.category_name,
        f.question,
        f.answer
      FROM faqs f
      INNER JOIN faqs_categories c
        ON f.category_id = c.category_id
      ORDER BY
        c.category_id ASC,
        f.faq_id ASC
    `);

    const categorizedFaqs = [];

    rows.forEach((row) => {
      let category = categorizedFaqs.find(
        (cat) => cat.categoryId === row.category_id
      );

      if (!category) {
        category = {
          categoryId: row.category_id,
          categoryName: row.category_name,
          faqs: [],
        };

        categorizedFaqs.push(category);
      }

      category.faqs.push({
        id: row.faq_id,
        question: row.question,
        answer: row.answer,
      });
    });

    res.json(categorizedFaqs);
  } catch (error) {
    console.error("FAQ database error:", error);

    res.status(500).json({
      error: "Unable to load FAQs from the database.",
    });
  }
});


// ========================================
// ADD FAQ
// ========================================

app.post("/api/faqs", async (req, res) => {
  try {
    const { category_id, question, answer } = req.body;

    if (
      !category_id ||
      !question ||
      !question.trim() ||
      !answer ||
      !answer.trim()
    ) {
      return res.status(400).json({
        error: "Category, question, and answer are required.",
      });
    }

    const [result] = await db.execute(
      `
        INSERT INTO faqs
          (category_id, question, answer)
        VALUES
          (?, ?, ?)
      `,
      [
        category_id,
        question.trim(),
        answer.trim(),
      ]
    );

    res.status(201).json({
      message: "FAQ created successfully.",
      faq_id: result.insertId,
    });
  } catch (error) {
    console.error("Create FAQ error:", error);

    res.status(500).json({
      error: "Unable to create FAQ.",
    });
  }
});


// ========================================
// UPDATE FAQ
// ========================================

app.put("/api/faqs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    if (
      !question ||
      !question.trim() ||
      !answer ||
      !answer.trim()
    ) {
      return res.status(400).json({
        error: "Question and answer are required.",
      });
    }

    const [result] = await db.execute(
      `
        UPDATE faqs
        SET
          question = ?,
          answer = ?
        WHERE faq_id = ?
      `,
      [
        question.trim(),
        answer.trim(),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "FAQ not found.",
      });
    }

    res.json({
      message: "FAQ updated successfully.",
    });
  } catch (error) {
    console.error("Update FAQ error:", error);

    res.status(500).json({
      error: "Unable to update FAQ.",
    });
  }
});


// ========================================
// DELETE FAQ
// ========================================

app.delete("/api/faqs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      `
        DELETE FROM faqs
        WHERE faq_id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "FAQ not found.",
      });
    }

    res.json({
      message: "FAQ deleted successfully.",
    });
  } catch (error) {
    console.error("Delete FAQ error:", error);

    res.status(500).json({
      error: "Unable to delete FAQ.",
    });
  }
});


// ========================================
// ADD FAQ CATEGORY
// ========================================

app.post("/api/faq-categories", async (req, res) => {
  try {
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        error: "Category name is required.",
      });
    }

    const [result] = await db.execute(
      `
        INSERT INTO faqs_categories
          (category_name)
        VALUES
          (?)
      `,
      [category_name.trim()]
    );

    res.status(201).json({
      message: "Category created successfully.",
      category_id: result.insertId,
    });
  } catch (error) {
    console.error("Create category error:", error);

    // Duplicate category name
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "A category with this name already exists.",
      });
    }

    res.status(500).json({
      error: "Unable to create category.",
    });
  }
});


// ========================================
// DIFY CHATBOT
// ========================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, user, conversation_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    if (!DIFY_API_KEY) {
      console.error("DIFY_API_KEY is missing from .env");

      return res.status(500).json({
        error: "Dify API key is not configured on the server.",
      });
    }

    const difyResponse = await fetch(
      `${DIFY_API_URL}/chat-messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {},
          query: message.trim(),
          response_mode: "blocking",
          user: user || "guest-user",
          conversation_id: conversation_id || "",
        }),
      }
    );

    const data = await difyResponse.json();

    console.log("Dify status:", difyResponse.status);
    console.log("Dify response:", data);

    if (!difyResponse.ok) {
      return res.status(difyResponse.status).json({
        error:
          data.message ||
          data.code ||
          "Dify API request failed.",
      });
    }

    return res.json({
      answer:
        data.answer ||
        "Dify returned an empty response.",
      conversation_id:
        data.conversation_id || "",
      message_id:
        data.message_id || "",
    });
  } catch (error) {
    console.error("Chatbot server error:", error);

    return res.status(500).json({
      error: "Unable to connect to Dify.",
      details: error.message,
    });
  }
});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(
    `H&A Cozy Pad chatbot server running on http://localhost:${PORT}`
  );
});