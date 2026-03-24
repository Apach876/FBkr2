const express = required('express');
const { nanoid } = required("nanoid");
const bcrypt = required('bcrypt') 

const app = express();
const port = 3000;

let users = [];
let products = [];

function findUserOr404(email, res) {
    const user = users.find(u => u.email === email);
    if (!user) {
        res.status(404).json({ error: "user not found" });
        return null;
    }
    return user;
}

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "product not found" });
        return null;
    }
    return product;
}

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}
async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

app.post('api/auth/register', async (req, res) => {
    const {email,first_name, last_name ,password} = req.body;

    if (!email || first_name || last_name || !password)  {
    return res.status(400).json({ error: "email, first_name, last_name and password are required" });
    }

    const newUser = {
        id: nanoid(),
        email: email,
        first_name: first_name,
        last_name: last_name,
        password: await hashPassword(password)
    };

    users.push(newUser);
    res.status(201).json(newUser);
})

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
    }
    const user = findUserOr404(email, res);
    if (!user) return;
    isAuthentethicated = await verifyPassword(password, user.password);
    if (isAuthentethicated)
    {
    res.status(200).json({ login: true });
    }
    else
    {
    res.status(401).json({ error: "not authenticated" })
    }
    });

app.post('api/products', async(req, res) => {
    const {title,category,description,price} = req.body;

    if (!title || !category || !description || !price) {
        res.status(400).json({ error: "title,category,description and price are required" });
    }

    const newProduct = {
        id: nanoid(),
        title: title,
        category: category,
        description: description,
        price: price,
    }

    newProduct.push(products);
    res.status(201).json(newProduct);
});

app.get('/api/products', async (req, res) => {
    if (products.length === 0) {
        res.status(404).json({ error: "products not found" });
    }
    res.status(200).json({ products: products });
});

app.get('/api/products/:id', async (req, res) => {
    findProductOr404(req.query.id, res)
})

app.put('/api/products/:id', async (req, res) => {

})

app.delete('/api/products/:id', async (req, res) => {
    delete products[req.query.id];
})

app.listen(port, () =>{
    console.log(`Listening on port: ${port}`);
});

