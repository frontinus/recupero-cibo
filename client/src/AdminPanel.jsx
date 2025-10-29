import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, FloatingLabel } from 'react-bootstrap';
import { API } from './API'; // Assuming API.jsx is in the same directory or adjust path

function AdminPanel() {
    // State for creating a shop
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [shopFoodType, setShopFoodType] = useState('');

    // State for creating a box
    const [boxType, setBoxType] = useState('Normal'); // Default value
    const [boxSize, setBoxSize] = useState('Medium'); // Default value
    const [boxPrice, setBoxPrice] = useState('');
    const [boxTimeSpan, setBoxTimeSpan] = useState(''); // e.g., "18:00-19:00"

    // General state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- Handlers ---

    const handleCreateShop = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Basic validation (more can be added)
        if (!shopName || !shopAddress || !shopPhone || !shopFoodType) {
            setError('All shop fields are required.');
            setLoading(false);
            return;
        }

        try {
            const result = await API.adminCreateShop(shopName, shopAddress, shopPhone, shopFoodType);
            setSuccess(`Shop "${shopName}" created successfully with ID: ${result.id}`);
            // Clear form
            setShopName('');
            setShopAddress('');
            setShopPhone('');
            setShopFoodType('');
        } catch (err) {
            console.error("Error creating shop:", err);
            // Assuming err is an array of error strings or similar
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to create shop: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBox = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Basic validation
        const priceNum = parseFloat(boxPrice);
        if (!boxType || !boxSize || !boxPrice || !boxTimeSpan || isNaN(priceNum) || priceNum <= 0) {
            setError('All box fields are required, and price must be a positive number.');
            setLoading(false);
            return;
        }
        if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(boxTimeSpan)) {
             setError('Time span must be in HH:MM-HH:MM format.');
             setLoading(false);
             return;
        }


        try {
            const result = await API.adminCreateBox(boxType, boxSize, priceNum, boxTimeSpan);
            setSuccess(`Box created successfully with ID: ${result.id}. Remember to assign it to a shop.`);
            // Clear form
            setBoxType('Normal');
            setBoxSize('Medium');
            setBoxPrice('');
            setBoxTimeSpan('');
        } catch (err) {
            console.error("Error creating box:", err);
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to create box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container style={{ marginTop: '6rem' }}>
            <h1 className="mb-4">Admin Panel</h1>

            {/* General Feedback Area */}
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Row xs={1} md={2} className="g-4"> {/* Use grid layout for cards */}
                {/* --- Create Shop Card --- */}
                <Col>
                    <Card>
                        <Card.Header as="h5">Create New Shop</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleCreateShop}>
                                <FloatingLabel controlId="shopName" label="Shop Name" className="mb-3">
                                    <Form.Control type="text" placeholder="Enter shop name" value={shopName} onChange={e => setShopName(e.target.value)} required />
                                </FloatingLabel>
                                <FloatingLabel controlId="shopAddress" label="Address" className="mb-3">
                                    <Form.Control type="text" placeholder="Enter address" value={shopAddress} onChange={e => setShopAddress(e.target.value)} required />
                                </FloatingLabel>
                                <FloatingLabel controlId="shopPhone" label="Phone Number" className="mb-3">
                                    <Form.Control type="tel" placeholder="Enter phone number" value={shopPhone} onChange={e => setShopPhone(e.target.value)} required />
                                </FloatingLabel>
                                <FloatingLabel controlId="shopFoodType" label="Food Type/Category" className="mb-3">
                                    <Form.Control type="text" placeholder="e.g., General, Piedmontese, Bakery" value={shopFoodType} onChange={e => setShopFoodType(e.target.value)} required />
                                </FloatingLabel>
                                <Button variant="primary" type="submit" disabled={loading}>
                                    {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Create Shop'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* --- Create Box Card --- */}
                <Col>
                    <Card>
                        <Card.Header as="h5">Create New Box</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleCreateBox}>
                                <Form.Group className="mb-3" controlId="boxType">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select value={boxType} onChange={e => setBoxType(e.target.value)}>
                                        <option value="Normal">Normal</option>
                                        <option value="Surprise">Surprise</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="boxSize">
                                    <Form.Label>Size</Form.Label>
                                    <Form.Select value={boxSize} onChange={e => setBoxSize(e.target.value)}>
                                        <option value="Small">Small</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Large">Large</option>
                                    </Form.Select>
                                </Form.Group>
                                <FloatingLabel controlId="boxPrice" label="Price ($)" className="mb-3">
                                    <Form.Control type="number" step="0.01" min="0.01" placeholder="Enter price" value={boxPrice} onChange={e => setBoxPrice(e.target.value)} required />
                                </FloatingLabel>
                                <FloatingLabel controlId="boxTimeSpan" label="Retrieval Time (HH:MM-HH:MM)" className="mb-3">
                                    <Form.Control type="text" pattern="\d{2}:\d{2}-\d{2}:\d{2}" placeholder="e.g., 18:00-19:00" value={boxTimeSpan} onChange={e => setBoxTimeSpan(e.target.value)} required />
                                    <Form.Text muted> Use 24-hour format. </Form.Text>
                                </FloatingLabel>
                                <Button variant="primary" type="submit" disabled={loading}>
                                    {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Create Box'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* --- Add More Cards/Sections Here --- */}
                {/* e.g., Add Item to Box, Assign Box to Shop, etc. */}

            </Row>
        </Container>
    );
}

export default AdminPanel; // Export as default