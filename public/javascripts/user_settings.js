function valPassword(selector) {
  if (selector === undefined)
    return [valPassword("#origPassword"), valPassword("#newPassword"), valPassword("#verifyPassword")].every(Boolean);
  let password_field = $(selector),
      error_text = password_field.siblings(".invalid-feedback");
  if (selector === "#verifyPassword" && password_field.val() !== $("#newPassword").val()) {
    password_field.removeClass("is-valid").addClass("is-invalid");
    error_text.text("Passwords don't match.");
    return false;
  }
  if (selector === "#newPassword" && password_field.val() === $("#origPassword").val()) {
    password_field.removeClass("is-valid").addClass("is-invalid");
    error_text.text("New password should be a different one.");
    return false;
  }
  if (password_field.val().length < 6) {
    password_field.removeClass("is-valid").addClass("is-invalid");
    error_text.text("At least 6 characters are required.");
    return false;
  } else {
    if (selector === "#origPassword") {
      password_field.removeClass("is-valid is-invalid");
    } else {
      password_field.removeClass("is-invalid").addClass("is-valid");
    }
    return true;
  }
}

function valBirthYear() {
  let birthyear_field = $("#birthyear");
  if (birthyear_field.val().length === 0) {
    birthyear_field.removeClass("is-invalid");
    return true;
  } else if ($.isNumeric(birthyear_field.val()) && parseInt(birthyear_field.val()) > 1900 && parseInt(birthyear_field.val()) <= (new Date()).getFullYear()) {
    birthyear_field.removeClass("is-invalid");
    return true;
  } else {
    birthyear_field.addClass("is-invalid");
    return false;
  }
}

function valForm(isProfile) {
  let submitBtn;
  $(".alert").addClass("d-none");
  if (isProfile) {
    if (valBirthYear()) {
      submitBtn = $("#submit-profile");
      submitBtn.prop("disabled", true).text("Processing...");
      $.post("", $("#profile-form").serialize(), function(data) {
        $(".alert-success").removeClass("d-none").text("Your profile has been updated successfully.");
      }).fail(function(xhr) {
        $(".alert-danger").removeClass("d-none").text(xhr.responseText);
      }).always(function () {
        submitBtn.removeAttr("disabled").text("Save Changes");
      });
    }
  } else {
    if (valPassword()) {
      submitBtn = $("#submit-credential");
      submitBtn.prop("disabled", true).text("Processing...");
      $.post("", $("#credential-form").serialize(), function(data) {
        $(".alert-success").removeClass("d-none").text("Your credential has been updated successfully.");
        $("#credential-form input.form-control").val("").removeClass("is-valid is-invalid");
      }).fail(function(xhr) {
        $(".alert-danger").removeClass("d-none").text(xhr.responseText);
      }).always(function () {
        submitBtn.removeAttr("disabled").text("Update Password");
      });
    }
  }
}

$(document).ready(function() {
  if (window.location.hash.substr(1) === "credential") {
    $("#credential-tab").tab("show");
  }

  $("#submit-profile").click(function () {
    valForm(true);
  });
  $("#submit-credential").click(function () {
    valForm(false);
  });
});