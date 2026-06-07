import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_CONFIG } from "./comments-config.js";

const root = document.getElementById("comments");
const problemId = root ? Number(root.dataset.problemId) : null;
const configured =
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.publishableKey &&
  !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_REF");

let supabase = null;
let session = null;
let comments = [];
let replyTo = null;

if (root) {
  initComments();
}

async function initComments() {
  renderShell("Loading comments...");

  if (!configured) {
    renderSetupNotice();
    return;
  }

  supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);

  const sessionResult = await supabase.auth.getSession();
  session = sessionResult.data.session;

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    render();
  });

  await loadComments();
  render();
}

async function loadComments() {
  const { data, error } = await supabase
    .from("problem_comments")
    .select("id, problem_id, parent_id, user_id, display_name, body, created_at, updated_at")
    .eq("problem_id", problemId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    renderShell("Could not load comments: " + error.message);
    return;
  }

  comments = data || [];
}

function renderShell(message) {
  root.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = "Comments";
  root.appendChild(heading);

  const status = document.createElement("p");
  status.className = "comments-status";
  status.textContent = message;
  root.appendChild(status);
}

function renderSetupNotice() {
  root.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = "Comments";
  root.appendChild(heading);

  const notice = document.createElement("div");
  notice.className = "comments-panel";
  notice.innerHTML =
    "<p>Comments are not connected yet. Set your Supabase project URL in <code>problems/comments-config.js</code>.</p>";
  root.appendChild(notice);
}

function render() {
  root.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "Comments";
  root.appendChild(heading);

  root.appendChild(renderAuthPanel());

  if (session) {
    root.appendChild(renderCommentForm());
  }

  const list = document.createElement("div");
  list.className = "comments-list";

  const tree = buildCommentTree(comments);
  if (tree.length === 0) {
    const empty = document.createElement("p");
    empty.className = "comments-status";
    empty.textContent = "No comments yet.";
    list.appendChild(empty);
  } else {
    tree.forEach((comment) => list.appendChild(renderComment(comment)));
  }

  root.appendChild(list);
}

function renderAuthPanel() {
  const panel = document.createElement("div");
  panel.className = "comments-panel";

  if (!session) {
    const form = document.createElement("form");
    form.className = "comments-login";

    const label = document.createElement("label");
    label.htmlFor = "comment-email";
    label.textContent = "Email";

    const input = document.createElement("input");
    input.id = "comment-email";
    input.type = "email";
    input.placeholder = "you@example.com";
    input.required = true;

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Send sign-in link";

    const message = document.createElement("p");
    message.className = "comments-status";

    form.append(label, input, button, message);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      message.textContent = "Sending sign-in link...";

      const { error } = await supabase.auth.signInWithOtp({
        email: input.value.trim(),
        options: {
          emailRedirectTo: window.location.href.split("#")[0]
        }
      });

      button.disabled = false;
      message.textContent = error ? error.message : "Check your email for the sign-in link.";
    });

    panel.appendChild(form);
    return panel;
  }

  const userLine = document.createElement("p");
  userLine.className = "comments-status";
  userLine.textContent = "Signed in as " + (session.user.email || "authenticated user") + ".";

  const signOut = document.createElement("button");
  signOut.type = "button";
  signOut.textContent = "Sign out";
  signOut.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  panel.append(userLine, signOut);
  return panel;
}

function renderCommentForm() {
  const form = document.createElement("form");
  form.className = "comment-form";

  const replyLabel = document.createElement("p");
  replyLabel.className = "comments-status";
  replyLabel.textContent = replyTo
    ? "Replying to " + replyTo.display_name + "."
    : "Leave a comment.";

  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 80;
  name.placeholder = "Display name";
  name.value = localStorage.getItem("problem-comment-display-name") || defaultDisplayName();

  const body = document.createElement("textarea");
  body.rows = 4;
  body.maxLength = 4000;
  body.required = true;
  body.placeholder = "Write a comment...";

  const actions = document.createElement("div");
  actions.className = "comments-actions";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = replyTo ? "Post reply" : "Post comment";
  actions.appendChild(submit);

  if (replyTo) {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel reply";
    cancel.addEventListener("click", () => {
      replyTo = null;
      render();
    });
    actions.appendChild(cancel);
  }

  form.append(replyLabel, name, body, actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = (name.value.trim() || defaultDisplayName()).slice(0, 80);
    const text = body.value.trim();
    if (!text) return;

    submit.disabled = true;
    localStorage.setItem("problem-comment-display-name", displayName);

    const { error } = await supabase.from("problem_comments").insert({
      problem_id: problemId,
      parent_id: replyTo ? replyTo.id : null,
      user_id: session.user.id,
      display_name: displayName,
      body: text
    });

    submit.disabled = false;

    if (error) {
      window.alert(error.message);
      return;
    }

    replyTo = null;
    await loadComments();
    render();
  });

  return form;
}

function renderComment(comment) {
  const article = document.createElement("article");
  article.className = "comment";

  const meta = document.createElement("div");
  meta.className = "comment-meta";

  const author = document.createElement("strong");
  author.textContent = comment.display_name || "Anonymous";

  const time = document.createElement("time");
  time.dateTime = comment.created_at;
  time.textContent = formatDate(comment.created_at);

  meta.append(author, time);

  const body = document.createElement("p");
  body.className = "comment-body";
  body.textContent = comment.body;

  const actions = document.createElement("div");
  actions.className = "comments-actions";

  if (session) {
    const reply = document.createElement("button");
    reply.type = "button";
    reply.textContent = "Reply";
    reply.addEventListener("click", () => {
      replyTo = comment;
      render();
      document.querySelector(".comment-form textarea")?.focus();
    });
    actions.appendChild(reply);
  }

  if (session && session.user.id === comment.user_id) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editComment(comment));
    actions.appendChild(edit);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteComment(comment));
    actions.appendChild(remove);
  }

  article.append(meta, body, actions);

  if (comment.children.length > 0) {
    const replies = document.createElement("div");
    replies.className = "comment-replies";
    comment.children.forEach((child) => replies.appendChild(renderComment(child)));
    article.appendChild(replies);
  }

  return article;
}

async function editComment(comment) {
  const nextBody = window.prompt("Edit comment", comment.body);
  if (nextBody === null) return;

  const text = nextBody.trim();
  if (!text) return;

  const { error } = await supabase
    .from("problem_comments")
    .update({ body: text, display_name: comment.display_name })
    .eq("id", comment.id);

  if (error) {
    window.alert(error.message);
    return;
  }

  await loadComments();
  render();
}

async function deleteComment(comment) {
  if (!window.confirm("Delete this comment?")) return;

  const { error } = await supabase
    .from("problem_comments")
    .update({ is_deleted: true })
    .eq("id", comment.id);

  if (error) {
    window.alert(error.message);
    return;
  }

  await loadComments();
  render();
}

function buildCommentTree(flatComments) {
  const byId = new Map();
  const roots = [];

  flatComments.forEach((comment) => {
    byId.set(comment.id, { ...comment, children: [] });
  });

  byId.forEach((comment) => {
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id).children.push(comment);
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

function defaultDisplayName() {
  const email = session?.user?.email || "";
  return email.includes("@") ? email.split("@")[0] : "Anonymous";
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
