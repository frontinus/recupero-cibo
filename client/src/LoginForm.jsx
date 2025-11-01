import { useState } from "react";
import { Button, Card, Col, Container, Form, Row, Spinner, Tab, Tabs } from "react-bootstrap";
import { Link } from "react-router-dom";
import validator from "validator";
import "./LoginForm.css";

/**
 * Enhanced login/register page with modern design
 * @param props.loginCbk callback to perform the actual login
 * @param props.registerCbk callback to perform registration
 * @param props.errorAlertActive true when the error alert on the top is active
 */
function LoginForm(props) {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="login-page-reset">
      <Container fluid className="login-container" style={{marginTop: props.errorAlertActive ? "2rem" : "6rem"}}>
        <Row className="justify-content-center align-items-center min-vh-75">
          <Col xs={12} sm={11} md={10} lg={8} xl={7} xxl={6}>
            <div className="mb-3">
              <Link to="/" className="text-decoration-none">
                <i className="bi bi-arrow-left"/> back to shops
              </Link>
            </div>
            
            <Card className="shadow-lg border-0 overflow-hidden">
              {/* Hero Section */}
              <div className="login-hero p-4 text-white text-center" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}>
                <div className="mb-3">
                  <i className="bi bi-basket2-fill" style={{ fontSize: '3rem' }}></i>
                </div>
                <h2 className="mb-2">Food Rescue Connect</h2>
                <p className="mb-0 opacity-90">Join us in reducing food waste and saving money!</p>
              </div>

              <Card.Body className="p-4">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-4 nav-justified"
                  fill
                >
                  <Tab 
                    eventKey="login" 
                    title={
                      <span>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Login
                      </span>
                    }
                  >
                    <LoginTab loginCbk={props.loginCbk} />
                  </Tab>
                  <Tab 
                    eventKey="register" 
                    title={
                      <span>
                        <i className="bi bi-person-plus me-2"></i>
                        Register
                      </span>
                    }
                  >
                    <RegisterTab registerCbk={props.registerCbk} />
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>

            {/* Info Cards */}
            <Row className="mt-4 g-4 justify-content-center">
              <Col xs={12} md={4}>
                <Card className="text-center border-0 shadow-sm h-100 info-card">
                  <Card.Body className="py-4 px-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-primary mb-3" style={{ fontSize: '2.5rem' }}>
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <h6 className="mb-2 fw-semibold" style={{ whiteSpace: 'nowrap' }}>Safe &amp; Secure</h6>
                    <p className="text-muted small mb-0" style={{ whiteSpace: 'normal', textAlign: 'center' }}>Your data is protected</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} md={4}>
                <Card className="text-center border-0 shadow-sm h-100 info-card">
                  <Card.Body className="py-4 px-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-success mb-3" style={{ fontSize: '2.5rem' }}>
                      <i className="bi bi-piggy-bank"></i>
                    </div>
                    <h6 className="mb-2 fw-semibold" style={{ whiteSpace: 'nowrap' }}>Save Money</h6>
                    <p className="text-muted small mb-0" style={{ whiteSpace: 'normal', textAlign: 'center' }}>Up to 70% off retail</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} md={4}>
                <Card className="text-center border-0 shadow-sm h-100 info-card">
                  <Card.Body className="py-4 px-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-warning mb-3" style={{ fontSize: '2.5rem' }}>
                      <i className="bi bi-heart"></i>
                    </div>
                    <h6 className="mb-2 fw-semibold" style={{ whiteSpace: 'nowrap' }}>Help Planet</h6>
                    <p className="text-muted small mb-0" style={{ whiteSpace: 'normal', textAlign: 'center' }}>Reduce food waste</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

/**
 * Login Tab Component
 */
function LoginTab({ loginCbk }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordValid, setPasswordValid] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = event => {
    event.preventDefault();
    
    const trimmedUsername = username.trim();
    const usernameError = validator.isEmpty(trimmedUsername) ? "Username is required" : "";
    const passwordValid = !validator.isEmpty(password);
    
    if (!usernameError && passwordValid) {
      setWaiting(true);
      loginCbk(username, password, () => setWaiting(false));
    } else {
      setUsernameError(usernameError);
      setPasswordValid(passwordValid);
    }
  };

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>
          <i className="bi bi-person me-2"></i>
          Username
        </Form.Label>
        <Form.Control
          isInvalid={!!usernameError}
          type="text"
          placeholder="Enter your username"
          value={username}
          autoFocus
          onChange={event => {setUsername(event.target.value); setUsernameError("");}}
          className="form-control-lg"
        />
        <Form.Control.Feedback type="invalid">
          {usernameError}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>
          <i className="bi bi-lock me-2"></i>
          Password
        </Form.Label>
        <div className="position-relative">
          <Form.Control
            isInvalid={!passwordValid}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={event => {setPassword(event.target.value); setPasswordValid(true);}}
            className="form-control-lg pe-5"
          />
          <Button
            variant="link"
            className="position-absolute end-0 top-50 translate-middle-y text-muted"
            onClick={() => setShowPassword(!showPassword)}
            style={{ border: 'none', background: 'none' }}
          >
            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </Button>
        </div>
        <Form.Control.Feedback type="invalid">
          Password is required
        </Form.Control.Feedback>
      </Form.Group>

      <div className="d-grid gap-2">
        <Button 
          type="submit" 
          disabled={waiting}
          size="lg"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          {waiting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/>
              {" "}Logging in...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Login
            </>
          )}
        </Button>
      </div>

      <div className="text-center mt-3">
        <small className="text-muted">
          Test credentials: alice / bob / charlie | password: password
        </small>
      </div>
    </Form>
  );
}

/**
 * Register Tab Component
 */
function RegisterTab({ registerCbk }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [waiting, setWaiting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    // Username validation
    const trimmedUsername = username.trim();
    if (validator.isEmpty(trimmedUsername)) {
      newErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!validator.isAlphanumeric(trimmedUsername)) {
      newErrors.username = "Username must contain only letters and numbers";
    }

    // Password validation
    if (validator.isEmpty(password)) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation
    if (validator.isEmpty(confirmPassword)) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = event => {
    event.preventDefault();
    
    if (validateForm()) {
      setWaiting(true);
      // Call the register callback
      if (registerCbk) {
        registerCbk(username, password, () => setWaiting(false));
      } else {
        // If no callback provided, show message
        alert("Registration functionality will be implemented soon!");
        setWaiting(false);
      }
    }
  };

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>
          <i className="bi bi-person me-2"></i>
          Username
        </Form.Label>
        <Form.Control
          isInvalid={!!errors.username}
          type="text"
          placeholder="Choose a username"
          value={username}
          autoFocus
          onChange={event => {setUsername(event.target.value); setErrors({...errors, username: ""});}}
          className="form-control-lg"
        />
        <Form.Control.Feedback type="invalid">
          {errors.username}
        </Form.Control.Feedback>
        <Form.Text className="text-muted">
          At least 3 characters, letters and numbers only
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>
          <i className="bi bi-lock me-2"></i>
          Password
        </Form.Label>
        <div className="position-relative">
          <Form.Control
            isInvalid={!!errors.password}
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={password}
            onChange={event => {setPassword(event.target.value); setErrors({...errors, password: ""});}}
            className="form-control-lg pe-5"
          />
          <Button
            variant="link"
            className="position-absolute end-0 top-50 translate-middle-y text-muted"
            onClick={() => setShowPassword(!showPassword)}
            style={{ border: 'none', background: 'none' }}
          >
            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </Button>
        </div>
        <Form.Control.Feedback type="invalid">
          {errors.password}
        </Form.Control.Feedback>
        <Form.Text className="text-muted">
          At least 6 characters
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>
          <i className="bi bi-lock-fill me-2"></i>
          Confirm Password
        </Form.Label>
        <div className="position-relative">
          <Form.Control
            isInvalid={!!errors.confirmPassword}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={event => {setConfirmPassword(event.target.value); setErrors({...errors, confirmPassword: ""});}}
            className="form-control-lg pe-5"
          />
          <Button
            variant="link"
            className="position-absolute end-0 top-50 translate-middle-y text-muted"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ border: 'none', background: 'none' }}
          >
            <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </Button>
        </div>
        <Form.Control.Feedback type="invalid">
          {errors.confirmPassword}
        </Form.Control.Feedback>
      </Form.Group>

      <div className="d-grid gap-2">
        <Button 
          type="submit" 
          disabled={waiting}
          size="lg"
          style={{
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            border: 'none'
          }}
        >
          {waiting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/>
              {" "}Creating account...
            </>
          ) : (
            <>
              <i className="bi bi-person-plus me-2"></i>
              Create Account
            </>
          )}
        </Button>
      </div>

      <div className="text-center mt-3">
        <small className="text-muted">
          By registering, you agree to help reduce food waste
        </small>
      </div>
    </Form>
  );
}

export { LoginForm };