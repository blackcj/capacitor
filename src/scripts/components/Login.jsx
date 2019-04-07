import React from 'react';

class Login extends React.Component {
    render() {
        return (
            <div class="container">
                <form class="login-form">
                    <label for="uname">e-mail</label>
                    <input type="text" placeholder="Enter Username" name="uname" required />
                    <br />
                    <br />
                    <label for="psw">password</label>
                    <input type="password" placeholder="Enter Password" name="psw" required />
                    <br />
                    <br />
                    <button type="submit">Login</button>
                </form>
            </div>
        )
    }
}

export default Login;