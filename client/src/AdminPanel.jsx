import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, FloatingLabel, Table, Badge, Modal, Tabs, Tab } from 'react-bootstrap';
import { API } from './API';

function AdminPanel() {
    // Add this state at the top with other states
    const [showCreateShopUserModal, setShowCreateShopUserModal] = useState(false);
    const [selectedShopForUser, setSelectedShopForUser] = useState('');
    const [newShopUsername, setNewShopUsername] = useState('');
    const [newShopPassword, setNewShopPassword] = useState('');

    // State for creating a shop
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [shopFoodType, setShopFoodType] = useState('');

    // State for creating a box
    const [boxType, setBoxType] = useState('Normal');
    const [boxSize, setBoxSize] = useState('Medium');
    const [boxPrice, setBoxPrice] = useState('');
    const [boxTimeSpan, setBoxTimeSpan] = useState('');
    const [boxItems, setBoxItems] = useState([{ name: '', quantity: 1 }]);

    // State for creating an item
    const [itemName, setItemName] = useState('');

    // State for existing data
    const [shops, setShops] = useState([]);
    const [boxes, setBoxes] = useState([]);
    const [users, setUsers] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);

    // State for assignment modals
    const [showAssignBoxToShop, setShowAssignBoxToShop] = useState(false);
    const [showAssignBoxToUser, setShowAssignBoxToUser] = useState(false);
    const [selectedBox, setSelectedBox] = useState('');
    const [selectedShop, setSelectedShop] = useState('');
    const [selectedUser, setSelectedUser] = useState('');

    // General state
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setDataLoading(true);
        try {
            const [shopsData, boxesData, itemsData, usersData] = await Promise.all([
                API.fetchShops(),
                API.fetchBoxes(),
                API.fetchAvailableItems(),
                API.fetchUsers()
            ]);
            setShops(shopsData);
            setBoxes(boxesData);
            setAvailableItems(itemsData);
            setUsers(usersData);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    const handleCreateShop = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!shopName || !shopAddress || !shopPhone || !shopFoodType) {
            setError('All shop fields are required.');
            setLoading(false);
            return;
        }

        try {
            const result = await API.adminCreateShop(shopName, shopAddress, shopPhone, shopFoodType);
            setSuccess(`Shop "${shopName}" created successfully with ID: ${result.id}`);
            setShopName('');
            setShopAddress('');
            setShopPhone('');
            setShopFoodType('');
            loadData();
        } catch (err) {
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

        if (boxType === 'Normal') {
            const validItems = boxItems.filter(item => item.name && item.quantity > 0);
            if (validItems.length === 0) {
                setError('Normal boxes must have at least one item.');
                setLoading(false);
                return;
            }
        }

        try {
            const result = await API.adminCreateBox(boxType, boxSize, priceNum, boxTimeSpan);
            const newBoxId = result.id;

            if (boxType === 'Normal') {
                const validItems = boxItems.filter(item => item.name && item.quantity > 0);
                for (const item of validItems) {
                    await API.adminAddItemToBox(newBoxId, item.name, item.quantity);
                }
            }

            setSuccess(`Box created successfully with ID: ${newBoxId}`);
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

    const handleCreateItem = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!itemName || itemName.trim().length === 0) {
            setError('Item name is required.');
            setLoading(false);
            return;
        }

        try {
            const result = await API.adminCreateItem(itemName.trim());
            setSuccess(`Item "${itemName}" created successfully!`);
            setItemName('');
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to create item: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignBoxToShop = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await API.adminAssignBoxToShop(parseInt(selectedBox), parseInt(selectedShop));
            setSuccess(`Box ${selectedBox} assigned to shop successfully`);
            setShowAssignBoxToShop(false);
            setSelectedBox('');
            setSelectedShop('');
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to assign box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignBoxToUser = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await API.adminAssignBoxToUser(parseInt(selectedBox), selectedUser);
            setSuccess(`Box ${selectedBox} assigned to user ${selectedUser}`);
            setShowAssignBoxToUser(false);
            setSelectedBox('');
            setSelectedUser('');
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to assign box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBoxFromShop = async (boxId, shopId) => {
        if (!window.confirm('Remove this box from the shop?')) return;
        
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await API.adminRemoveBoxFromShop(boxId, shopId);
            setSuccess(`Box removed from shop successfully`);
            loadData();
        } catch (err) {
            const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
            setError(`Failed to remove box: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShopUser = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
        await API.adminCreateShopUser(
            parseInt(selectedShopForUser), 
            newShopUsername, 
            newShopPassword
        );
        setSuccess(`Shop user account created for ${newShopUsername}`);
        setShowCreateShopUserModal(false);
        setSelectedShopForUser('');
        setNewShopUsername('');
        setNewShopPassword('');
    } catch (err) {
        const errorMsg = Array.isArray(err) ? err.join(', ') : String(err);
        setError(`Failed to create shop user: ${errorMsg}`);
    } finally {
        setLoading(false);
    }
};

    if (dataLoading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading admin panel...</p>
            </Container>
        );
    }

    return (
        <Container style={{ marginTop: '6rem' }}>
            <div className="mb-4">
                <h1>
                    <i className="bi bi-shield-lock-fill me-2 text-primary"></i>
                    Admin Panel
                </h1>
                <p className="text-muted">Manage shops, boxes, and assignments</p>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Tabs defaultActiveKey="create" className="mb-4">
                <Tab eventKey="create" title={<span><i className="bi bi-plus-circle me-2"></i>Create New</span>}>
                    <Row className="g-4 mt-2">
                        <Col md={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header as="h5" className="bg-primary text-white">
                                    <i className="bi bi-shop me-2"></i>Create New Shop
                                </Card.Header>
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
                                        <FloatingLabel controlId="shopFoodType" label="Food Type" className="mb-3">
                                            <Form.Control type="text" placeholder="e.g., Italian" value={shopFoodType} onChange={e => setShopFoodType(e.target.value)} required />
                                        </FloatingLabel>
                                        <Button variant="primary" type="submit" disabled={loading} className="w-100">
                                            {loading ? <><Spinner as="span" animation="border" size="sm" /> Creating...</> : <><i className="bi bi-plus-lg me-2"></i>Create Shop</>}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header as="h5" className="bg-warning text-dark">
                                    <i className="bi bi-basket me-2"></i>Create New Item
                                </Card.Header>
                                <Card.Body>
                                    <Form onSubmit={handleCreateItem}>
                                        <FloatingLabel controlId="itemName" label="Item Name" className="mb-3">
                                            <Form.Control 
                                                type="text" 
                                                placeholder="Enter item name" 
                                                value={itemName} 
                                                onChange={e => setItemName(e.target.value)} 
                                                required 
                                            />
                                        </FloatingLabel>
                                        <Button variant="warning" type="submit" disabled={loading} className="w-100">
                                            {loading ? <><Spinner as="span" animation="border" size="sm" /> Creating...</> : <><i className="bi bi-plus-lg me-2"></i>Create Item</>}
                                        </Button>
                                        
                                        {availableItems.length > 0 && (
                                            <div className="mt-3">
                                                <small className="text-muted">
                                                    <i className="bi bi-info-circle me-1"></i>
                                                    {availableItems.length} items available
                                                </small>
                                            </div>
                                        )}
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header as="h5" className="bg-success text-white">
                                    <i className="bi bi-box-seam me-2"></i>Create New Box
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
                                            <Form.Control type="number" step="0.01" min="0.01" placeholder="Enter price" value={boxPrice} onChange={e => setBoxPrice(e.target.value)} required />
                                        </FloatingLabel>
                                        <FloatingLabel controlId="boxTimeSpan" label="Time (HH:MM-HH:MM)" className="mb-3">
                                            <Form.Control type="text" pattern="\d{2}:\d{2}-\d{2}:\d{2}" placeholder="18:00-19:00" value={boxTimeSpan} onChange={e => setBoxTimeSpan(e.target.value)} required />
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
                                                                value={item.name}
                                                                onChange={e => handleItemChange(index, 'name', e.target.value)}
                                                                required
                                                            >
                                                                <option value="">Select item...</option>
                                                                {availableItems && availableItems.length > 0 ? (
                                                                    availableItems.map(availItem => (
                                                                        <option key={availItem.NAME || availItem.name} value={availItem.NAME || availItem.name}>
                                                                            {availItem.NAME || availItem.name}
                                                                        </option>
                                                                    ))
                                                                ) : (
                                                                    <option value="" disabled>No items available - create items first</option>
                                                                )}
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
                                                <small className="text-muted">
                                                    <i className="bi bi-info-circle me-1"></i>
                                                    Add items that will be in this bag
                                                </small>
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
                    </Row>
                </Tab>

                <Tab eventKey="manage" title={<span><i className="bi bi-gear me-2"></i>Manage</span>}>
                    <Row className="g-4 mt-2">
                        <Col md={4}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0"><i className="bi bi-shop me-2"></i>Shops ({shops.length})</h5>
                                    <Button size="sm" variant="outline-success" onClick={() => setShowCreateShopUserModal(true)}>
                                        <i className="bi bi-person-plus me-1"></i>Create Shop User
                                    </Button>
                                </Card.Header>
                                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <Table striped hover responsive>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>Boxes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shops.map(shop => (
                                                <tr key={shop.Shopid}>
                                                    <td><Badge bg="secondary">{shop.Shopid}</Badge></td>
                                                    <td><strong>{shop.ShopName}</strong></td>
                                                    <td><Badge bg="info">{shop.Food_type}</Badge></td>
                                                    <td><Badge bg="primary">{shop.Boxes?.length || 0}</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0"><i className="bi bi-box-seam me-2"></i>Boxes ({boxes.length})</h5>
                                    <div>
                                        <Button size="sm" variant="outline-primary" className="me-2" onClick={() => setShowAssignBoxToShop(true)}>
                                            <i className="bi bi-shop me-1"></i>To Shop
                                        </Button>
                                        <Button size="sm" variant="outline-success" onClick={() => setShowAssignBoxToUser(true)}>
                                            <i className="bi bi-person me-1"></i>To User
                                        </Button>
                                    </div>
                                </Card.Header>
                                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <Table striped hover responsive size="sm">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Type</th>
                                                <th>Size</th>
                                                <th>Price</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {boxes.map(box => (
                                                <tr key={box.ID}>
                                                    <td><Badge bg="secondary">{box.ID}</Badge></td>
                                                    <td>{box.Type}</td>
                                                    <td><Badge bg="info">{box.Size}</Badge></td>
                                                    <td>${box.Price}</td>
                                                    <td>
                                                        <Badge bg={box.Is_owned ? 'danger' : 'success'}>
                                                            {box.Is_owned ? 'Reserved' : 'Available'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-light">
                                    <h5 className="mb-0"><i className="bi bi-basket me-2"></i>Items ({availableItems.length})</h5>
                                </Card.Header>
                                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    {availableItems.length === 0 ? (
                                        <div className="text-center text-muted py-4">
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                                            <p className="mt-2">No items created yet</p>
                                            <small>Go to "Create New" tab to add items</small>
                                        </div>
                                    ) : (
                                        <Table striped hover responsive size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availableItems.map((item, index) => (
                                                    <tr key={item.Name || item.NAME || index}>
                                                        <td>
                                                            <i className="bi bi-box me-2 text-muted"></i>
                                                            {item.Name || item.NAME}
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
                </Tab>

                <Tab eventKey="assignments" title={<span><i className="bi bi-diagram-3 me-2"></i>Assignments</span>}>
                    <Row className="g-4 mt-2">
                        <Col xs={12}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-light">
                                    <h5 className="mb-0"><i className="bi bi-link-45deg me-2"></i>Box-Shop Assignments</h5>
                                </Card.Header>
                                <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    <Table striped hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Shop</th>
                                                <th>Box ID</th>
                                                <th>Type</th>
                                                <th>Size</th>
                                                <th>Price</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shops.flatMap(shop => 
                                                shop.Boxes?.map(boxId => {
                                                    const box = boxes.find(b => b.ID === boxId);
                                                    if (!box) return null;
                                                    return (
                                                        <tr key={`${shop.Shopid}-${boxId}`}>
                                                            <td><strong>{shop.ShopName}</strong></td>
                                                            <td><Badge bg="secondary">{boxId}</Badge></td>
                                                            <td>{box.Type}</td>
                                                            <td><Badge bg="info">{box.Size}</Badge></td>
                                                            <td>${box.Price}</td>
                                                            <td>
                                                                <Badge bg={box.Is_owned ? 'danger' : 'success'}>
                                                                    {box.Is_owned ? 'Reserved' : 'Available'}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline-danger"
                                                                    onClick={() => handleRemoveBoxFromShop(boxId, shop.Shopid)}
                                                                    disabled={loading}
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }).filter(Boolean)
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>
            </Tabs>

            <Modal show={showAssignBoxToShop} onHide={() => setShowAssignBoxToShop(false)}>
                <Modal.Header closeButton>
                    <Modal.Title><i className="bi bi-shop me-2"></i>Assign Box to Shop</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Box</Form.Label>
                        <Form.Select value={selectedBox} onChange={e => setSelectedBox(e.target.value)}>
                            <option value="">Choose a box...</option>
                            {boxes.map(box => (
                                <option key={box.ID} value={box.ID}>
                                    Box {box.ID} - {box.Type} ({box.Size}) - ${box.Price}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Select Shop</Form.Label>
                        <Form.Select value={selectedShop} onChange={e => setSelectedShop(e.target.value)}>
                            <option value="">Choose a shop...</option>
                            {shops.map(shop => (
                                <option key={shop.Shopid} value={shop.Shopid}>
                                    {shop.ShopName} ({shop.Food_type})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignBoxToShop(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAssignBoxToShop} disabled={!selectedBox || !selectedShop || loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Assign'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showAssignBoxToUser} onHide={() => setShowAssignBoxToUser(false)}>
                <Modal.Header closeButton>
                    <Modal.Title><i className="bi bi-person me-2"></i>Assign Box to User</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Box</Form.Label>
                        <Form.Select value={selectedBox} onChange={e => setSelectedBox(e.target.value)}>
                            <option value="">Choose a box...</option>
                            {boxes.filter(box => !box.Is_owned).map(box => (
                                <option key={box.ID} value={box.ID}>
                                    Box {box.ID} - {box.Type} ({box.Size}) - ${box.Price}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Select User</Form.Label>
                        <Form.Select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                            <option value="">Choose a user...</option>
                            {users.map(user => (
                                <option key={user.Username} value={user.Username}>
                                    {user.Username}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignBoxToUser(false)}>Cancel</Button>
                    <Button variant="success" onClick={handleAssignBoxToUser} disabled={!selectedBox || !selectedUser || loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Assign'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCreateShopUserModal} onHide={() => setShowCreateShopUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-person-plus me-2"></i>
                            Create Shop User Account
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Shop</Form.Label>
                            <Form.Select 
                                value={selectedShopForUser} 
                                onChange={e => setSelectedShopForUser(e.target.value)}
                            >
                            <option value="">Choose a shop...</option>
                            {shops.map(shop => (
                                <option key={shop.Shopid} value={shop.Shopid}>
                                    {shop.ShopName}
                                </option>
                            ))}
                            </Form.Select>
                        </Form.Group>
        
                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                                <Form.Control type="text" placeholder="Enter username" value={newShopUsername} onChange={e => setNewShopUsername(e.target.value)}/>
                        </Form.Group>
        
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                                <Form.Control type="password" placeholder="Enter password (min 6 characters)" value={newShopPassword} onChange={e => setNewShopPassword(e.target.value)}/>
                        </Form.Group>
        
                        <Alert variant="info" className="mb-0">
                            <i className="bi bi-info-circle me-2"></i>
                                This will create a shop owner account that can manage only this shop's boxes.
                        </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateShopUserModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleCreateShopUser} disabled={!selectedShopForUser || !newShopUsername || newShopPassword.length < 6 || loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Create User'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default AdminPanel;