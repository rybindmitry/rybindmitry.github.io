import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_CONFIG } from "./comments-config.js";

const configured =
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.publishableKey &&
  !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_REF");

const supabase = configured
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey)
  : null;

const MIN_PROBLEM_STATEMENT_LENGTH = 20;
const MIN_SOLUTION_TEXT_LENGTH = 20;

const problemForm = document.getElementById("submit-problem-form");
const solutionForm = document.getElementById("submit-solution-form");

if (problemForm) {
  initProblemForm(problemForm);
}

if (solutionForm) {
  initSolutionForm(solutionForm);
}

function initProblemForm(form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("submission-status");
    const submit = form.querySelector("button[type='submit']");

    if (isSpamTrapFilled(form)) {
      showStatus(status, "Submission received. Thank you.", false);
      form.reset();
      return;
    }

    if (!supabase) {
      showStatus(status, "Supabase is not configured yet.", true);
      return;
    }

    submit.disabled = true;
    showStatus(status, "Submitting...", false);

    const problemStatement = valueOf("problem-statement");
    if (problemStatement.length < MIN_PROBLEM_STATEMENT_LENGTH) {
      submit.disabled = false;
      showStatus(status, "Problem statement must be at least 20 characters.", true);
      return;
    }

    const payload = {
      problem_statement: problemStatement,
      author_name: valueOf("problem-author"),
      submitter_contact: nullableValueOf("submitter-contact"),
      submitter_website: nullableValueOf("submitter-website"),
      verification_notes: nullableValueOf("verification-notes")
    };

    const { error } = await supabase.from("problem_submissions").insert(payload);
    submit.disabled = false;

    if (error) {
      showStatus(status, "Could not submit problem: " + error.message, true);
      return;
    }

    form.reset();
    showStatus(status, "Problem submitted. Thank you.", false);
  });
}

function initSolutionForm(form) {
  const problemInput = document.getElementById("solution-problem-id");
  const problemFromUrl = new URLSearchParams(window.location.search).get("problem");
  if (problemFromUrl && /^\d+$/.test(problemFromUrl)) {
    problemInput.value = problemFromUrl;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("submission-status");
    const submit = form.querySelector("button[type='submit']");

    if (isSpamTrapFilled(form)) {
      showStatus(status, "Submission received. Thank you.", false);
      form.reset();
      return;
    }

    if (!supabase) {
      showStatus(status, "Supabase is not configured yet.", true);
      return;
    }

    const problemId = Number(problemInput.value);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      showStatus(status, "Please enter a valid problem number.", true);
      return;
    }

    submit.disabled = true;
    showStatus(status, "Submitting...", false);

    const solutionText = valueOf("solution-text");
    if (solutionText.length < MIN_SOLUTION_TEXT_LENGTH) {
      submit.disabled = false;
      showStatus(status, "Solution must be at least 20 characters.", true);
      return;
    }

    const payload = {
      problem_id: problemId,
      submitter_name: nullableValueOf("solution-submitter-name"),
      submitter_contact: nullableValueOf("solution-submitter-contact"),
      submitter_website: nullableValueOf("solution-submitter-website"),
      solution_text: solutionText,
      solution_url: nullableValueOf("solution-url"),
      notes: nullableValueOf("solution-notes")
    };

    const { error } = await supabase.from("solution_submissions").insert(payload);
    submit.disabled = false;

    if (error) {
      showStatus(status, "Could not submit solution: " + error.message, true);
      return;
    }

    form.reset();
    if (problemFromUrl && /^\d+$/.test(problemFromUrl)) {
      problemInput.value = problemFromUrl;
    }
    showStatus(status, "Solution submitted. Thank you.", false);
  });
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function nullableValueOf(id) {
  const value = valueOf(id);
  return value.length > 0 ? value : null;
}

function showStatus(element, message, isError) {
  element.textContent = message;
  element.className = isError ? "submission-status error" : "submission-status";
}

function isSpamTrapFilled(form) {
  const trap = form.querySelector("[data-spam-trap]");
  return trap && trap.value.trim().length > 0;
}
