const express = require('express');
const cors = require('cors');
const { nanoid } = require("nanoid");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const JWT_SECRET = 'KEY';
const REFRESH_SECRET = 'REFRESH_KEY';

app.use(cors());
app.use(express.json());

let users = [];
let products = [];
let refreshTokens = [];

const ROLES = {
    GUEST: 'guest',
    USER: 'user',
    SELLER: 'seller',
    ADMIN: 'admin'
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access token missing" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Access denied" });
        }
        next();
    };
};

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
}

app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;
    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: "All fields required" });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Exists" });
    }
    const newUser = {
        id: nanoid(),
        email,
        first_name,
        last_name,
        password: await hashPassword(password),
        role: users.length === 0 ? ROLES.ADMIN : ROLES.USER,
        isBlocked: false
    };
    users.push(newUser);
    res.status(201).json({ id: newUser.id, email: newUser.email });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || user.isBlocked || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Unauthorized or Blocked" });
    }
    const tokens = generateTokens(user);
    refreshTokens.push(tokens.refreshToken);
    res.json(tokens);
});

app.post("/api/auth/refresh", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || !refreshTokens.includes(token)) return res.sendStatus(403);

    jwt.verify(token, REFRESH_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        const user = users.find(u => u.id === decoded.id);
        if (!user || user.isBlocked) return res.sendStatus(403);

        refreshTokens = refreshTokens.filter(t => t !== token);
        const tokens = generateTokens(user);
        refreshTokens.push(tokens.refreshToken);
        res.json(tokens);
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    const { password, ...profile } = user;
    res.json(profile);
});

app.get('/api/users', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
    res.json(users.map(({password, ...u}) => u));
});

app.get('/api/users/:id', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const { password, ...u } = user;
    res.json(u);
});

app.put('/api/users/:id', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    users[index] = { ...users[index], ...req.body, id: users[index].id, password: users[index].password };
    res.json(users[index]);
});

app.delete('/api/users/:id', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) user.isBlocked = true;
    res.sendStatus(204);
});

app.get('/api/products', authenticateToken, authorize([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
    res.json(products);
});

app.post('/api/products', authenticateToken, authorize([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
    const product = { id: nanoid(), ...req.body };
    products.push(product);
    res.status(201).json(product);
});

app.get('/api/products/:id', authenticateToken, authorize([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    product ? res.json(product) : res.sendStatus(404);
});

app.put('/api/products/:id', authenticateToken, authorize([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.sendStatus(404);
    products[index] = { ...products[index], ...req.body, id: products[index].id };
    res.json(products[index]);
});

app.delete('/api/products/:id', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.sendStatus(204);
});

app.listen(port, () => console.log(`Server: ${port}`));