import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, FloatingLabel, Table, Badge, Modal } from 'react-bootstrap';
import { API } from './API';
import { useNavigate } from 'react-router-dom';

function ShopOwnerPanel() {
    const navigate = useNavigate(); // Add this line
    const [shop, setShop] = useState(null);
    const [boxes, setBoxes] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    
    // Box creation state
    const [boxType, setBoxType] = useState('Normal');
    const [boxSize, setBoxSize] = useState('Medium');
    const [boxPrice, setBoxPrice] = useState('');
    const [boxTimeSpan, setBoxTimeSpan] = useState('');
    const [boxItems, setBoxItems] = useState([{ name: '', quantity: 1 }]);
    
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedBoxId, setSelectedBoxId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setDataLoading(true);
        try {
            const [shopData, boxesData, itemsData] = await Promise.all([
                API.fetchCurrentShop(),
                API.fetchShopBoxes(),
                API.fetchAvailableItems()
            ]);
            setShop(shopData);
            setBoxes(boxesData);
            setAvailableItems(itemsData);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    const handleCreateBox = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const priceNum = parseFloat(boxPrice);
        if (!boxType || !boxSize || !boxPrice || !boxTimeSpan || isNaN(priceNum) || priceNum <= 0) {
            setError('All fields are required, and price must be positive');
            setLoading(false);
            return;
        }

        if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(boxTimeSpan)) {
            setError('Time span must be in HH:MM-HH:MM format');
            setLoading(false);
            return;
        }

        if (boxType === 'Normal') {
            const validItems = boxItems.filter(item => item.NAME && item.quantity > 0);
            if (validItems.length === 0) {
                setError('Normal boxes must have at least one item');
                setLoading(false);
                return;
            }
        }

        try {
            const items = boxType === 'Normal' ? boxItems.filter(item => item.name && item.quantity > 0) : [];
            await API.createShopBox(boxType, boxSize, priceNum, boxTimeSpan, items);
            
            setSuccess('Box created successfully!');
            setBoxType('Normal');
            setBoxSize('Medium');
            setBoxPrice('');
            setBoxTimeSpan('');
            setBoxItems([{ name: '', quantity: 1 }]);
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to create box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBox = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            await API.deleteShopBox(selectedBoxId);
            setSuccess('Box deleted successfully');
            setShowDeleteModal(false);
            setSelectedBoxId(null);
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to delete box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPurchase = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            await API.cancelShopPurchase(selectedBoxId);
            setSuccess('Purchase cancelled successfully');
            setShowCancelModal(false);
            setSelectedBoxId(null);
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to cancel purchase: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setBoxItems([...boxItems, { name: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = boxItems.filter((_, i) => i !== index);
        setBoxItems(newItems.length > 0 ? newItems : [{ name: '', quantity: 1 }]);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...boxItems];
        newItems[index][field] = value;
        setBoxItems(newItems);
    };

    if (dataLoading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading shop panel...</p>
            </Container>
        );
    }

    return (
        <Container style={{ marginTop: '6rem' }}>
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center">
                    <div>    
                        <h1>
                            <i className="bi bi-shop me-2 text-primary"></i>
                            {shop?.ShopName || 'Shop'} Management
                        </h1>
                        <p className="text-muted">Manage your boxes and reservations</p>
                    </div>
                    <Button variant="outline-primary" onClick={() => navigate('/')} className="d-flex align-items-center">
                    <i className="bi bi-house-door me-2"></i>
                    Back to Main
                    </Button>
                </div>    
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            {shop && (
                <Card className="mb-4 shadow-sm">
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <p className="mb-1"><strong>Address:</strong> {shop.Adress}</p>
                                <p className="mb-1"><strong>Phone:</strong> {shop.Phone_nb}</p>
                            </Col>
                            <Col md={6}>
                                <p className="mb-1"><strong>Food Type:</strong> <Badge bg="info">{shop.Food_type}</Badge></p>
                                <p className="mb-1"><strong>Total Boxes:</strong> <Badge bg="primary">{boxes.length}</Badge></p>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            <Row className="g-4">
                <Col lg={5}>
                    <Card className="shadow-sm h-100">
                        <Card.Header as="h5" className="bg-success text-white">
                            <i className="bi bi-plus-circle me-2"></i>Create New Box
                        </Card.Header>
                        <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <Form onSubmit={handleCreateBox}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select value={boxType} onChange={e => { setBoxType(e.target.value); setBoxItems([{ name: '', quantity: 1 }]); }}>
                                        <option value="Normal">Normal</option>
                                        <option value="Surprise">Surprise</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Size</Form.Label>
                                    <Form.Select value={boxSize} onChange={e => setBoxSize(e.target.value)}>
                                        <option value="Small">Small</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Large">Large</option>
                                    </Form.Select>
                                </Form.Group>

                                <FloatingLabel controlId="boxPrice" label="Price ($)" className="mb-3">
                                    <Form.Control 
                                        type="number" 
                                        step="0.01" 
                                        min="0.01" 
                                        placeholder="Enter price" 
                                        value={boxPrice} 
                                        onChange={e => setBoxPrice(e.target.value)} 
                                        required 
                                    />
                                </FloatingLabel>

                                <FloatingLabel controlId="boxTimeSpan" label="Pickup Time (HH:MM-HH:MM)" className="mb-3">
                                    <Form.Control 
                                        type="text" 
                                        pattern="\d{2}:\d{2}-\d{2}:\d{2}" 
                                        placeholder="18:00-19:00" 
                                        value={boxTimeSpan} 
                                        onChange={e => setBoxTimeSpan(e.target.value)} 
                                        required 
                                    />
                                </FloatingLabel>

                                {boxType === 'Normal' && (
                                    <div className="mb-3 p-3 border rounded bg-light">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label className="mb-0 fw-bold">
                                                <i className="bi bi-list-ul me-2"></i>
                                                Box Contents
                                            </Form.Label>
                                            <Button size="sm" variant="outline-success" onClick={handleAddItem}>
                                                <i className="bi bi-plus-lg"></i>
                                            </Button>
                                        </div>
                                        {boxItems.map((item, index) => (
                                            <Row key={index} className="mb-2 align-items-center">
                                                <Col xs={6}>
                                                    <Form.Select
                                                        size="sm"
                                                        value={item.Name}
                                                        onChange={e => handleItemChange(index, 'name', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select item...</option>
                                                        {availableItems.map(availItem => (
                                                            <option key={availItem.NAME} value={availItem.NAME}>
                                                                {availItem.NAME}
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col xs={4}>
                                                    <Form.Control
                                                        type="number"
                                                        size="sm"
                                                        min="1"
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                        required
                                                    />
                                                </Col>
                                                <Col xs={2}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => handleRemoveItem(index)}
                                                        disabled={boxItems.length === 1}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </Button>
                                                </Col>
                                            </Row>
                                        ))}
                                    </div>
                                )}

                                {boxType === 'Surprise' && (
                                    <Alert variant="info" className="mb-3">
                                        <i className="bi bi-gift me-2"></i>
                                        Surprise bags don't show contents to users
                                    </Alert>
                                )}

                                <Button variant="success" type="submit" disabled={loading} className="w-100">
                                    {loading ? <><Spinner as="span" animation="border" size="sm" /> Creating...</> : <><i className="bi bi-plus-lg me-2"></i>Create Box</>}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={7}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">
                                <i className="bi bi-box-seam me-2"></i>
                                Your Boxes ({boxes.length})
                            </h5>
                        </Card.Header>
                        <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {boxes.length === 0 ? (
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                    <p className="mt-3">No boxes created yet</p>
                                    <small>Create your first box using the form on the left</small>
                                </div>
                            ) : (
                                <Table striped hover responsive>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Type</th>
                                            <th>Size</th>
                                            <th>Price</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {boxes.map(box => (
                                            <tr key={box.ID}>
                                                <td><Badge bg="secondary">{box.ID}</Badge></td>
                                                <td>{box.Type}</td>
                                                <td><Badge bg="info">{box.Size}</Badge></td>
                                                <td>${box.Price}</td>
                                                <td><small>{box.Retrieve_time_span}</small></td>
                                                <td>
                                                    <Badge bg={box.Is_owned ? 'danger' : 'success'}>
                                                        {box.Is_owned ? 'Reserved' : 'Available'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {box.Is_owned ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-warning"
                                                            onClick={() => {
                                                                setSelectedBoxId(box.ID);
                                                                setShowCancelModal(true);
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            <i className="bi bi-x-circle me-1"></i>
                                                            Cancel
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            onClick={() => {
                                                                setSelectedBoxId(box.ID);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                        Confirm Delete
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to delete this box?</p>
                    <Alert variant="warning" className="mb-0">
                       <i className="bi bi-info-circle me-2"></i>
                           This action cannot be undone. Only boxes without active reservations can be deleted.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                         Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteBox} disabled={loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Delete Box'}
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Cancel Purchase Modal */}
        <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                    Cancel Reservation
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to cancel this reservation?</p>
                <Alert variant="info" className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    The box will become available again for other customers.
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                    Close
                </Button>
                <Button variant="warning" onClick={handleCancelPurchase} disabled={loading}>
                    {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Cancel Reservation'}
                </Button>
            </Modal.Footer>
        </Modal>
    </Container>
);}

export default ShopOwnerPanel;