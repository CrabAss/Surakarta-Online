/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018 CrabAss

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


let isValidating = false;

function onloadCallback() { // reCAPTCHA
    let submitBtn = $("#submitBtn");
    submitBtn.removeAttr("disabled").text("Sign Up");
}

function onSubmit() {
    let submitBtn = $("#submitBtn");
    submitBtn.prop("disabled", true).text("Processing...");
    $.post("", $("#signup-form").serialize(), function(data){
        if (~data.indexOf("success"))
            submitSuccess();
        else
            submitFailed(data);
    }).fail(function() {
        submitFailed();
    });
}

function valUsername(calledBySubmitBtn) {
    if (isValidating === true) return;

    let username_field = $("#username");
    let err_text = $("#username-container").find(".invalid-feedback");

    if (username_field.val().length < 3) {
        username_field.removeClass("is-valid").addClass("is-invalid");
        if (username_field.val().length === 0)
            err_text.text("The username is required. ");
        else
            err_text.text("The username is too short. ");
        return false;
    }

    isValidating = true;
    if (!calledBySubmitBtn) username_field.removeClass("is-valid is-invalid");
    $.post("/u/signup/validate/username", { username: username_field.val() }, function () {
        username_field.removeClass("is-invalid").addClass("is-valid");
        if (calledBySubmitBtn === true) valForm(true);
    }).fail(function (xhr) {
        username_field.removeClass("is-valid").addClass("is-invalid");
        if (xhr.status === 400)
            err_text.text("This username has been used. ");
        else
            err_text.text("Unknown error occurred. ");
        if (calledBySubmitBtn === true) valForm(false);
    }).always(function () {
        isValidating = false;
    });
}

function valPassword() {
    let password_field = $("#password");
    if (password_field.val().length < 6) {
        password_field.removeClass("is-valid").addClass("is-invalid");
        return false;
    } else {
        password_field.removeClass("is-invalid").addClass("is-valid");
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

function valForm(usernameValResult) {
    if (usernameValResult === undefined) {
        if (valUsername(true) === false) {
            valPassword();
            valBirthYear();
        }
    } else {
        if ([usernameValResult, valPassword(), valBirthYear()].every(Boolean) === true) {
            // avoid short-circuit evaluation
            grecaptcha.execute();
        }
    }
}

function submitSuccess() {
    $("#signup-form").remove();
    $(".alert-success").removeAttr("style");
}

function submitFailed(data) {
    alert("Failed!");
    if (data) alert(data);
    grecaptcha.reset();
    onloadCallback();
}

$(document).ready(function() {
    $("#submitBtn").click(function() {
        valForm();
    });
});