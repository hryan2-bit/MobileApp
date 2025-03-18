document.addEventListener("DOMContentLoaded", () => {
    const auth = localStorage.getItem('auth');

    if (auth) {
        $.ajaxSetup({
            beforeSend: function (x) {
                x.setRequestHeader("Authorization", `Basic ${auth}`);
            }
        });
    } else {
        if (window.location.pathname !== "/login.html") {
            window.location.href = "login.html";
        }
    }

    const error = document.getElementById("error");

document.getElementById("loginForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    $.ajax({
        url: '/api/users',
        method: 'GET',
        beforeSend: function (x) {
            x.setRequestHeader("Authorization", `Basic ${auth}`);
        },
        success: function () {
            alert("Login successful!");
            localStorage.setItem("auth", credentials);
            window.location.href = "randomizer.html";
        }
    })
})

document.getElementById("registerForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const username = document.getElementById("usernameReg").value;
    const password = document.getElementById("passwordReg").value;
    const passVerify =  document.getElementById("passwordReg2").value;

    if (password !== passVerify) {
        error.textContent = "Passwords do not match!";
        return
    }

    $.ajax({
        url: '/api/users',
        method: "POST",
        data: JSON.stringify({ username, password }),
        success: function () {
            alert("User registered successfully!");
            window.location.href = "login.html";
        }
    })
})
})