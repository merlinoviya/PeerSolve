import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const categories = [
  {
    name: "Programming",
    icon: "💻",
    description: "C, C++, Python, Java & more",
  },
  {
    name: "Electronics",
    icon: "⚡",
    description: "Circuits, Embedded & IoT",
  },
  {
    name: "AI & ML",
    icon: "🤖",
    description: "Artificial Intelligence",
  },
  {
    name: "Mathematics",
    icon: "📐",
    description: "Engineering mathematics",
  },
];

function App() {
  // =====================================================
  // AUTH
  // =====================================================

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("peersolve_user"));
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    localStorage.getItem("peersolve_token") || ""
  );

  // =====================================================
  // QUESTIONS
  // =====================================================

  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionDetails, setQuestionDetails] = useState(null);

  // =====================================================
  // SEARCH
  // =====================================================

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // =====================================================
  // MODALS
  // =====================================================

  const [showAskForm, setShowAskForm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [authMode, setAuthMode] = useState("login");

  // =====================================================
  // QUESTION FORM
  // =====================================================

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // =====================================================
  // REPLY
  // =====================================================

  const [replyText, setReplyText] = useState("");

  // =====================================================
  // AUTH FORM
  // =====================================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =====================================================
  // EDIT QUESTION
  // =====================================================

  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // =====================================================
  // EDIT REPLY
  // =====================================================

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");

  // =====================================================
  // GENERAL
  // =====================================================

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  // =====================================================
  // LOAD QUESTIONS
  // =====================================================

  const loadQuestions = async () => {
    try {
      const response = await fetch(`${API}/questions`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load questions");
      }

      setQuestions(data);
    } catch (error) {
      console.error("Questions error:", error);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // =====================================================
  // LOAD QUESTION DETAILS
  // =====================================================

  const loadQuestionDetails = async (questionId) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/questions/${questionId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load question"
        );
      }

      setQuestionDetails(data);
      setSelectedQuestion(questionId);

      setTimeout(() => {
        document
          .getElementById("question-details")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTER QUESTIONS
  // =====================================================

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        question.title?.toLowerCase().includes(searchText) ||
        question.description?.toLowerCase().includes(searchText) ||
        question.subject?.toLowerCase().includes(searchText);

      const matchesCategory =
        selectedCategory === "All" ||
        question.subject?.toLowerCase() ===
          selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [questions, search, selectedCategory]);

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setMessage("Please fill all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      localStorage.setItem("peersolve_token", data.token);
      localStorage.setItem(
        "peersolve_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);

      setName("");
      setEmail("");
      setPassword("");
      setShowAuth(false);
      setMessage("");

      alert("Registration successful!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem("peersolve_token", data.token);
      localStorage.setItem(
        "peersolve_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);

      setEmail("");
      setPassword("");
      setShowAuth(false);
      setMessage("");

      alert("Login successful!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("peersolve_token");
    localStorage.removeItem("peersolve_user");

    setToken("");
    setUser(null);
    setSelectedQuestion(null);
    setQuestionDetails(null);

    alert("Logged out successfully.");
  };

  // =====================================================
  // CREATE QUESTION
  // =====================================================

  const handlePostQuestion = async () => {
    if (!token) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (!title.trim() || !subject || !description.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to post question"
        );
      }

      setTitle("");
      setSubject("");
      setDescription("");
      setShowAskForm(false);

      await loadQuestions();

      alert("Question posted successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // START EDIT QUESTION
  // =====================================================

  const startEditQuestion = () => {
    if (!questionDetails || !user) return;

    if (user.id !== questionDetails.author_id) {
      alert("Only the question owner can edit this question.");
      return;
    }

    setEditTitle(questionDetails.title);
    setEditSubject(questionDetails.subject);
    setEditDescription(questionDetails.description);

    setEditingQuestion(true);
    setMessage("");
  };

  // =====================================================
  // UPDATE QUESTION
  // =====================================================

  const handleUpdateQuestion = async () => {
    if (!editTitle.trim() || !editSubject || !editDescription.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/questions/${selectedQuestion}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            subject: editSubject,
            description: editDescription.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update question"
        );
      }

      setEditingQuestion(false);

      await loadQuestionDetails(selectedQuestion);
      await loadQuestions();

      alert("Question updated successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CREATE REPLY
  // =====================================================

  const handlePostReply = async () => {
    if (!user || !token) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (!replyText.trim()) {
      setMessage("Please write an answer first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/questions/${selectedQuestion}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: replyText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to post reply"
        );
      }

      setReplyText("");

      await loadQuestionDetails(selectedQuestion);
      await loadQuestions();

      alert("Answer posted successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // START EDIT REPLY
  // =====================================================

  const startEditReply = (reply) => {
    if (!user) return;

    if (user.id !== reply.author_id) {
      alert("Only the reply owner can edit this reply.");
      return;
    }

    setEditingReplyId(reply.id);
    setEditReplyText(reply.content);
    setMessage("");
  };

  // =====================================================
  // UPDATE REPLY
  // =====================================================

  const handleUpdateReply = async (replyId) => {
    if (!editReplyText.trim()) {
      setMessage("Reply cannot be empty.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/replies/${replyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: editReplyText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update reply"
        );
      }

      setEditingReplyId(null);
      setEditReplyText("");

      await loadQuestionDetails(selectedQuestion);
      await loadQuestions();

      alert("Reply updated successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ACCEPT ANSWER
  // =====================================================

  const handleAcceptAnswer = async (replyId) => {
    if (!token || !user) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (
      !questionDetails ||
      user.id !== questionDetails.author_id
    ) {
      alert(
        "Only the person who posted the question can accept an answer."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/questions/${selectedQuestion}/accept/${replyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to accept answer"
        );
      }

      await loadQuestionDetails(selectedQuestion);

      alert("Answer accepted successfully! ✅");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DELETE REPLY
  // =====================================================

  const handleDeleteReply = async (replyId) => {
    if (!token) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this reply?"
    );

    if (!confirmed) return;

    try {
      const endpoint = isAdmin
        ? `${API}/admin/replies/${replyId}`
        : `${API}/replies/${replyId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete reply"
        );
      }

      await loadQuestionDetails(selectedQuestion);
      await loadQuestions();

      alert(
        isAdmin
          ? "Reply removed by admin."
          : "Reply deleted successfully."
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // =====================================================
  // DELETE QUESTION
  // =====================================================

  const handleDeleteQuestion = async (
    questionId = selectedQuestion
  ) => {
    if (!token || !questionId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );

    if (!confirmed) return;

    try {
      const endpoint = isAdmin
        ? `${API}/admin/questions/${questionId}`
        : `${API}/questions/${questionId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete question"
        );
      }

      setSelectedQuestion(null);
      setQuestionDetails(null);

      await loadQuestions();

      alert(
        isAdmin
          ? "Question removed by admin."
          : "Question deleted successfully."
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // =====================================================
  // OPEN ASK FORM
  // =====================================================

  const openAskForm = () => {
    if (!user) {
      setAuthMode("login");
      setMessage("");
      setShowAuth(true);
      return;
    }

    setMessage("");
    setShowAskForm(true);
  };

  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  const openAdminDashboard = () => {
    document
      .getElementById("admin-dashboard")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="navbar">

        <a
          className="logo"
          href="#home"
          onClick={() => {
            setSelectedQuestion(null);
            setQuestionDetails(null);
          }}
        >
          <span className="logo-icon">P</span>
          Peer<span>Solve</span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#questions">Questions</a>
          <a href="#categories">Categories</a>
        </div>

        <div className="nav-actions">

          {user ? (
            <>
              <span className="user-name">
                👋 {user.name}
              </span>

              {isAdmin && (
                <button
                  className="admin-btn"
                  onClick={openAdminDashboard}
                >
                  🛡 Admin
                </button>
              )}

              <button
                className="login-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                onClick={() => {
                  setAuthMode("login");
                  setMessage("");
                  setShowAuth(true);
                }}
              >
                Login
              </button>

              <button
                className="signup-btn"
                onClick={() => {
                  setAuthMode("register");
                  setMessage("");
                  setShowAuth(true);
                }}
              >
                Get Started
              </button>
            </>
          )}

        </div>

      </nav>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero" id="home">

        <div className="hero-content">

          <div className="badge">
            🎓 Student Knowledge Community
          </div>

          <h1>
            Ask. Learn.
            <span>Solve Together.</span>
          </h1>

          <p>
            A community where students ask doubts,
            share knowledge, and help each other
            find the right answers.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={openAskForm}
            >
              + Ask a Question
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("questions")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Explore Questions →
            </button>

          </div>

          <div className="stats">

            <div>
              <strong>{questions.length}+</strong>
              <small>Questions</small>
            </div>

            <div>
              <strong>3,800+</strong>
              <small>Answers</small>
            </div>

            <div>
              <strong>850+</strong>
              <small>Students</small>
            </div>

          </div>

        </div>

        <div className="hero-card">

          <div className="floating-card card-one">

            <span>💡</span>

            <div>
              <strong>Question Solved</strong>
              <small>AI & Machine Learning</small>
            </div>

            <b>✓</b>

          </div>

          <div className="question-preview">

            <div className="preview-top">
              <span>AI & ML</span>
              <span>2 min ago</span>
            </div>

            <h3>
              How does a neural network learn?
            </h3>

            <p>
              Can someone explain backpropagation
              in simple terms?
            </p>

            <div className="preview-bottom">
              <span>👤 Alex</span>
              <span>💬 5 Answers</span>
            </div>

          </div>

          <div className="floating-card card-two">

            <span>🏆</span>

            <div>
              <strong>Accepted Answer</strong>
              <small>Best solution selected</small>
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          SEARCH
      ================================================= */}

      <section className="search-section">

        <div className="search-container">

          <div className="search-icon">⌕</div>

          <input
            type="text"
            placeholder="Search questions, subjects or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}

        </div>

        <div className="filter-buttons">

          <button
            className={
              selectedCategory === "All"
                ? "active-filter"
                : ""
            }
            onClick={() => setSelectedCategory("All")}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.name}
              className={
                selectedCategory === category.name
                  ? "active-filter"
                  : ""
              }
              onClick={() =>
                setSelectedCategory(category.name)
              }
            >
              {category.name}
            </button>
          ))}

        </div>

      </section>

      {/* =================================================
          QUESTIONS
      ================================================= */}

      <section
        className="questions-section"
        id="questions"
      >

        <div className="section-heading">

          <div>
            <p className="section-label">
              COMMUNITY
            </p>

            <h2>Recent Questions</h2>

            <p>
              See what students are asking right now.
            </p>
          </div>

          <button
            className="view-btn"
            onClick={() =>
              setSelectedCategory("All")
            }
          >
            View All →
          </button>

        </div>

        {filteredQuestions.length === 0 ? (

          <div className="empty-state">

            <div>🔎</div>

            <h3>No questions found</h3>

            <p>
              Be the first student to ask a question!
            </p>

            <button
              className="primary-btn"
              onClick={openAskForm}
            >
              Ask a Question
            </button>

          </div>

        ) : (

          <div className="question-grid">

            {filteredQuestions.map((question) => (

              <div
                className="question-card"
                key={question.id}
              >

                <div className="question-top">

                  <span className="subject">
                    {question.subject}
                  </span>

                  <span className="time">
                    {question.time || ""}
                  </span>

                </div>

                <h3>{question.title}</h3>

                <p>{question.description}</p>

                <div className="question-footer">

                  <span>
                    👤 {question.author || "Student"}
                  </span>

                  <span>
                    💬 {question.replies || 0} Replies
                  </span>

                </div>

                <button
                  className="answer-btn"
                  onClick={() =>
                    loadQuestionDetails(question.id)
                  }
                >
                  View Question →
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* =================================================
          QUESTION DETAILS
      ================================================= */}

      {questionDetails && (

        <section
          className="details-section"
          id="question-details"
        >

          <div className="details-header">

            <button
              className="back-btn"
              onClick={() => {
                setSelectedQuestion(null);
                setQuestionDetails(null);
                setEditingQuestion(false);
              }}
            >
              ← Back to Questions
            </button>

            <span className="details-subject">
              {questionDetails.subject}
            </span>

          </div>

          {/* =================================================
              QUESTION CARD
          ================================================= */}

          <div className="question-detail-card">

            {!editingQuestion ? (

              <>
                <div className="detail-meta">
                  Asked by{" "}
                  <strong>
                    {questionDetails.author || "Student"}
                  </strong>
                </div>

                <h1>{questionDetails.title}</h1>

                <p className="detail-description">
                  {questionDetails.description}
                </p>

                <div className="detail-footer">

                  <span>
                    💬{" "}
                    {questionDetails.replies?.length || 0}{" "}
                    Replies
                  </span>

                  <div className="detail-actions">

                    {/* ONLY QUESTION OWNER CAN EDIT */}
                    {user &&
                      user.id === questionDetails.author_id && (
                        <button
                          className="edit-question-btn"
                          onClick={startEditQuestion}
                        >
                          ✏️ Edit Question
                        </button>
                      )}

                    {/* OWNER OR ADMIN CAN DELETE */}
                    {user &&
                      (user.id === questionDetails.author_id ||
                        isAdmin) && (
                        <button
                          className="delete-question-btn"
                          onClick={() =>
                            handleDeleteQuestion()
                          }
                        >
                          🗑 Delete Question
                        </button>
                      )}

                  </div>

                </div>
              </>

            ) : (

              <div className="edit-question-form">

                <p className="section-label">
                  EDIT QUESTION
                </p>

                <h2>Update Your Question</h2>

                <div className="form-group">

                  <label>Question Title</label>

                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) =>
                      setEditTitle(e.target.value)
                    }
                  />

                </div>

                <div className="form-group">

                  <label>Subject</label>

                  <select
                    value={editSubject}
                    onChange={(e) =>
                      setEditSubject(e.target.value)
                    }
                  >

                    <option value="">
                      Select a subject
                    </option>

                    <option value="Programming">
                      Programming
                    </option>

                    <option value="Electronics">
                      Electronics
                    </option>

                    <option value="AI & ML">
                      AI & ML
                    </option>

                    <option value="Mathematics">
                      Mathematics
                    </option>

                  </select>

                </div>

                <div className="form-group">

                  <label>Description</label>

                  <textarea
                    rows="5"
                    value={editDescription}
                    onChange={(e) =>
                      setEditDescription(e.target.value)
                    }
                  />

                </div>

                {message && (
                  <div className="form-error">
                    {message}
                  </div>
                )}

                <div className="edit-buttons">

                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setEditingQuestion(false);
                      setMessage("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    className="submit-question"
                    onClick={handleUpdateQuestion}
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : "💾 Save Changes"}
                  </button>

                </div>

              </div>

            )}

          </div>

          {/* =================================================
              REPLIES
          ================================================= */}

          <div className="replies-header">

            <div>

              <p className="section-label">
                DISCUSSION
              </p>

              <h2>
                {questionDetails.replies?.length || 0} Answers
              </h2>

            </div>

          </div>

          {questionDetails.replies?.length === 0 ? (

            <div className="no-replies">

              <div>💬</div>

              <h3>No answers yet</h3>

              <p>
                Be the first person to help solve this doubt.
              </p>

            </div>

          ) : (

            <div className="replies-list">

              {questionDetails.replies.map((reply) => (

                <div
                  className={
                    reply.accepted
                      ? "reply-card accepted-reply"
                      : "reply-card"
                  }
                  key={reply.id}
                >

                  {reply.accepted && (
                    <div className="accepted-badge">
                      ✓ ACCEPTED ANSWER
                    </div>
                  )}

                  <div className="reply-top">

                    <div className="reply-user">

                      <div className="avatar">
                        {(reply.author || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>

                        <strong>
                          {reply.author || "Student"}
                        </strong>

                        <small>Student</small>

                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      EDITING REPLY
                  ================================================= */}

                  {editingReplyId === reply.id ? (

                    <div className="edit-reply-form">

                      <textarea
                        rows="5"
                        value={editReplyText}
                        onChange={(e) =>
                          setEditReplyText(e.target.value)
                        }
                      />

                      {message && (
                        <div className="form-error">
                          {message}
                        </div>
                      )}

                      <div className="edit-buttons">

                        <button
                          className="secondary-btn"
                          onClick={() => {
                            setEditingReplyId(null);
                            setEditReplyText("");
                            setMessage("");
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          className="submit-question"
                          onClick={() =>
                            handleUpdateReply(reply.id)
                          }
                          disabled={loading}
                        >
                          {loading
                            ? "Saving..."
                            : "💾 Save Reply"}
                        </button>

                      </div>

                    </div>

                  ) : (

                    <p className="reply-content">
                      {reply.content}
                    </p>

                  )}

                  {/* =================================================
                      REPLY ACTIONS
                  ================================================= */}

                  {editingReplyId !== reply.id && (

                    <div className="reply-actions">

                      {/* QUESTION OWNER CAN ACCEPT */}
                      {user &&
                        user.id === questionDetails.author_id &&
                        !reply.accepted && (
                          <button
                            className="accept-btn"
                            disabled={loading}
                            onClick={() =>
                              handleAcceptAnswer(reply.id)
                            }
                          >
                            ✓ Accept Answer
                          </button>
                        )}

                      {/* REPLY OWNER CAN EDIT */}
                      {user &&
                        user.id === reply.author_id && (
                          <button
                            className="edit-reply-btn"
                            onClick={() =>
                              startEditReply(reply)
                            }
                          >
                            ✏️ Edit
                          </button>
                        )}

                      {/* REPLY OWNER OR ADMIN CAN DELETE */}
                      {user &&
                        (user.id === reply.author_id ||
                          isAdmin) && (
                          <button
                            className="reply-delete-btn"
                            onClick={() =>
                              handleDeleteReply(reply.id)
                            }
                          >
                            🗑 Delete
                          </button>
                        )}

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

          {/* =================================================
              WRITE ANSWER
          ================================================= */}

          <div className="write-answer">

            <p className="section-label">
              SHARE YOUR KNOWLEDGE
            </p>

            <h2>Your Answer</h2>

            {!user ? (

              <div className="login-to-reply">

                <p>
                  Login to share your answer with the community.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuth(true);
                  }}
                >
                  Login to Reply →
                </button>

              </div>

            ) : (

              <>
                <textarea
                  className="reply-input"
                  rows="6"
                  placeholder="Write a helpful answer..."
                  value={replyText}
                  onChange={(e) =>
                    setReplyText(e.target.value)
                  }
                />

                {message && (
                  <div className="form-error">
                    {message}
                  </div>
                )}

                <button
                  className="submit-question"
                  onClick={handlePostReply}
                  disabled={loading}
                >
                  {loading
                    ? "Posting..."
                    : "Post Answer →"}
                </button>
              </>

            )}

          </div>

        </section>

      )}

      {/* =================================================
          ADMIN DASHBOARD
      ================================================= */}

      {isAdmin && (

        <section
          className="admin-dashboard"
          id="admin-dashboard"
        >

          <div className="admin-heading">

            <div>

              <p className="section-label">
                ADMIN PANEL
              </p>

              <h2>
                Moderation Dashboard 🛡
              </h2>

              <p>
                Manage questions and replies submitted by students.
              </p>

            </div>

            <div className="admin-status">
              ● ADMIN ACCESS
            </div>

          </div>

          <div className="admin-stats">

            <div className="admin-stat">

              <span>❓</span>

              <div>

                <strong>
                  {questions.length}
                </strong>

                <small>Questions</small>

              </div>

            </div>

            <div className="admin-stat">

              <span>💬</span>

              <div>

                <strong>
                  {questions.reduce(
                    (total, question) =>
                      total + Number(question.replies || 0),
                    0
                  )}
                </strong>

                <small>Replies</small>

              </div>

            </div>

            <div className="admin-stat">

              <span>🛡</span>

              <div>

                <strong>Admin</strong>

                <small>Moderation</small>

              </div>

            </div>

          </div>

          <div className="admin-info">

            <div>

              <h3>🛡 Moderation Tools</h3>

              <p>
                Administrators can review questions
                and remove abusive content.
              </p>

            </div>

            <button
              className="admin-refresh"
              onClick={loadQuestions}
            >
              ↻ Refresh
            </button>

          </div>

          <div className="admin-question-list">

            <h3>All Questions</h3>

            {questions.length === 0 ? (

              <div className="admin-empty">
                No questions available.
              </div>

            ) : (

              questions.map((question) => (

                <div
                  className="admin-question"
                  key={question.id}
                >

                  <div className="admin-question-info">

                    <span className="subject">
                      {question.subject}
                    </span>

                    <h4>{question.title}</h4>

                    <p>{question.description}</p>

                    <small>
                      👤 {question.author || "Student"}
                      {" • "}
                      💬 {question.replies || 0} replies
                    </small>

                  </div>

                  <div className="admin-actions">

                    <button
                      className="admin-view"
                      onClick={() =>
                        loadQuestionDetails(question.id)
                      }
                    >
                      View
                    </button>

                    <button
                      className="admin-delete"
                      onClick={() =>
                        handleDeleteQuestion(question.id)
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        </section>

      )}

      {/* =================================================
          CATEGORIES
      ================================================= */}

      <section
        className="categories"
        id="categories"
      >

        <div className="category-heading">

          <p className="section-label">
            EXPLORE
          </p>

          <h2>Browse by Category</h2>

          <p>
            Find questions and discussions based on your subject.
          </p>

        </div>

        <div className="category-grid">

          {categories.map((category) => (

            <button
              className="category-card"
              key={category.name}
              onClick={() => {

                setSelectedCategory(category.name);

                document
                  .getElementById("questions")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });

              }}
            >

              <span>{category.icon}</span>

              <h3>{category.name}</h3>

              <p>{category.description}</p>

              <div className="category-arrow">
                →
              </div>

            </button>

          ))}

        </div>

      </section>

      {/* =================================================
          CTA
      ================================================= */}

      <section className="cta-section">

        <div>

          <p className="section-label">
            JOIN THE COMMUNITY
          </p>

          <h2>Have a question?</h2>

          <p>
            Don't keep your doubt to yourself.
            Ask the community and learn together.
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={openAskForm}
        >
          Ask Your Question →
        </button>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <div className="footer-top">

          <div>

            <a
              className="footer-logo"
              href="#home"
            >
              <span className="logo-icon">P</span>
              PeerSolve
            </a>

            <p>
              Ask questions. Share knowledge. Learn together.
            </p>

          </div>

          <div className="footer-links">

            <a href="#home">Home</a>
            <a href="#questions">Questions</a>
            <a href="#categories">Categories</a>

          </div>

        </div>

        <div className="footer-bottom">

          <span>© 2026 PeerSolve</span>

          <span>
            Team 12 • Full Stack Project
          </span>

        </div>

      </footer>

      {/* =================================================
          ASK QUESTION MODAL
      ================================================= */}

      {showAskForm && (

        <div
          className="modal-overlay"
          onClick={(e) => {

            if (e.target.className === "modal-overlay") {
              setShowAskForm(false);
              setMessage("");
            }

          }}
        >

          <div className="ask-modal">

            <button
              className="close-btn"
              onClick={() => {
                setShowAskForm(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="modal-icon">💬</div>

            <p className="section-label">
              ASK THE COMMUNITY
            </p>

            <h2>Ask a Question</h2>

            <p className="modal-subtitle">
              Share your doubt and let other students
              help you find the answer.
            </p>

            <div className="form-group">

              <label>Question Title</label>

              <input
                type="text"
                placeholder="e.g. How does a transistor work?"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>Subject</label>

              <select
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
              >

                <option value="">
                  Select a subject
                </option>

                <option value="Programming">
                  Programming
                </option>

                <option value="Electronics">
                  Electronics
                </option>

                <option value="AI & ML">
                  AI & ML
                </option>

                <option value="Mathematics">
                  Mathematics
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>Describe your doubt</label>

              <textarea
                rows="5"
                placeholder="Explain your question in detail..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

            </div>

            {message && (
              <div className="form-error">
                {message}
              </div>
            )}

            <button
              className="submit-question"
              onClick={handlePostQuestion}
              disabled={loading}
            >
              {loading
                ? "Posting..."
                : "Post Question →"}
            </button>

          </div>

        </div>

      )}

      {/* =================================================
          LOGIN / REGISTER MODAL
      ================================================= */}

      {showAuth && (

        <div
          className="modal-overlay"
          onClick={(e) => {

            if (e.target.className === "modal-overlay") {
              setShowAuth(false);
              setMessage("");
            }

          }}
        >

          <div className="ask-modal auth-modal">

            <button
              className="close-btn"
              onClick={() => {
                setShowAuth(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="modal-icon">
              {authMode === "login" ? "🔐" : "🚀"}
            </div>

            <p className="section-label">
              PEERSOLVE ACCOUNT
            </p>

            <h2>
              {authMode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h2>

            <p className="modal-subtitle">
              {authMode === "login"
                ? "Login to answer questions and help other students."
                : "Join the student community and start learning together."}
            </p>

            {authMode === "register" && (

              <div className="form-group">

                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />

              </div>

            )}

            <div className="form-group">

              <label>Email Address</label>

              <input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

            </div>

            {message && (
              <div className="form-error">
                {message}
              </div>
            )}

            <button
              className="submit-question"
              disabled={loading}
              onClick={
                authMode === "login"
                  ? handleLogin
                  : handleRegister
              }
            >
              {loading
                ? "Please wait..."
                : authMode === "login"
                ? "Login →"
                : "Create Account →"}
            </button>

            <div className="auth-switch">

              {authMode === "login" ? (
                <>
                  Don't have an account?

                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setMessage("");
                    }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?

                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setMessage("");
                    }}
                  >
                    Login
                  </button>
                </>
              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;