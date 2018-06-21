let validating = false;

function onSubmit(token) {
  let submitBtn = $("#submitBtn");
  submitBtn.prop("disabled", true);
  submitBtn.text("Processing...");
  $.post("", $("#signup-form").serialize(),
      function(data){
        if (~data.indexOf("success"))
          submitSuccess();
        else
          submitFailed(data);
      })
      .fail(function() {
        submitFailed();
      });
}

function valUsername(vldWaiting) {
  if (validating === true) {
    return;
  }
  let username_field = $("#username");
  let err_text = $("#username-container").find(".invalid-feedback");
  if (username_field.val().length < 3) {
    username_field.removeClass("is-valid");
    username_field.addClass("is-invalid");
    if (username_field.val().length === 0)
      err_text.text("The username is required. ");
    else
      err_text.text("The username is too short. ");
    return false;
  }
  validating = true;
  $.post("/u/signup/validate/username", { username: username_field.val() }, function (data) {
    let vldUsername = false;
    if (data.indexOf("available") >= 0) {
      username_field.removeClass("is-invalid");
      username_field.addClass("is-valid");
      vldUsername = true;
    } else if (data.indexOf("no") >= 0) {
      username_field.removeClass("is-valid");
      username_field.addClass("is-invalid");
      err_text.text("The username has been used. ");
      vldUsername = false;
    } else {
      vldUsername = false;
    }
    validating = false;
    if (vldWaiting === true) {
      valForm(vldUsername);
    }
  });
}

function valPassword() {
  let password_field = $("#password");
  if (password_field.val().length < 6) {
    password_field.removeClass("is-valid");
    password_field.addClass("is-invalid");
    return false;
  } else {
    password_field.removeClass("is-invalid");
    password_field.addClass("is-valid");
    return true;
  }
}

function valBirthYear() {
  let birthyear_field = $("#birthyear");
  let err_text = $("#birthyear-container").find(".invalid-feedback");
  if (birthyear_field.val().length === 0) {
    birthyear_field.removeClass("is-valid");
    birthyear_field.removeClass("is-invalid");
    return true;
  } else if ($.isNumeric(birthyear_field.val()) && parseInt(birthyear_field.val()) > 1900 && parseInt(birthyear_field.val()) <= (new Date()).getFullYear()) {
    birthyear_field.removeClass("is-invalid");
    birthyear_field.addClass("is-valid");
    return true;
  } else {
    birthyear_field.removeClass("is-valid");
    birthyear_field.addClass("is-invalid");
    err_text.text("You know, it's NOT your year of birth :-)");
    return false;
  }
}

function valGender() {
  let gender = $("#gender-container");
  if ($("input:radio[name=gender]").is(":checked")) {
    gender.find(".invalid-feedback").css("display", "none");
    gender.find(".valid-feedback").css("display", "block");
  }
  return true;
}

function valForm(vldUsername) {
  if (vldUsername === undefined) {
    if(valUsername(true) === false) {
      valPassword();
      valBirthYear();
      valGender();
    }
  } else {
    if ([vldUsername, valPassword(), valBirthYear(), valGender()].every(Boolean) === true) {
      grecaptcha.execute();
    }
  }
}

function submitSuccess() {
  $("#signup-form").remove();
  $(".alert-success").removeAttr("style")
}

function submitFailed(data) {
  alert("Failed!");
  if (data) alert(data);
}

$(document).ready(function() {
  $("input:radio[name=gender]").change(function(){
    let gender = $("#gender-container");
    gender.find(".invalid-feedback").css("display", "none");
    gender.find(".valid-feedback").css("display", "block");
  });
  $(document).on("click", "#submitBtn", function(){
    valForm();
  });
  $("input:radio:checked").each(function() {
    $(this).parent().addClass("active");
  });
  $("#submitBtn").removeAttr("disabled");
});