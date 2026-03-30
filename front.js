import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import api from './api';

const App = () => {
    const [user, setUser] = useState(null);
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) api.get('/auth/me').then(r => setUser(r.data)).catch(() => setUser(null));
    }, []);

    const logout = () => { localStorage.clear(); setUser(null); };

    return (
        <Router>
            <nav>
                <Link to="/">Products</Link> |
                {user?.role === 'admin' && <Link to="/users"> Users</Link>} |
                {!user ? <Link to="/login"> Login</Link> : <button onClick={logout}>Exit ({user.role})</button>}
            </nav>
            <Routes>
                <Route path="/" element={<Products user={user} />} />
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/products/:id" element={<ProductView user={user} />} />
            </Routes>
        </Router>
    );
};

const Login = ({ setUser }) => {
    const [creds, setCreds] = useState({ email: '', password: '' });
    const navigate = useNavigate();
    const handle = async (e) => {
        e.preventDefault();
        const { data } = await api.post('/auth/login', creds);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        const me = await api.get('/auth/me');
        setUser(me.data);
        navigate('/');
    };
    return (
        <form onSubmit={handle}>
            <input placeholder="Email" onChange={e => setCreds({...creds, email: e.target.value})} />
            <input type="password" placeholder="Pass" onChange={e => setCreds({...creds, password: e.target.value})} />
            <button>Login</button>
            <Link to="/register">Register</Link>
        </form>
    );
};

const Products = ({ user }) => {
    const [list, setList] = useState([]);
    const [showForm, setShowForm] = useState(false);
    useEffect(() => { if(user) api.get('/products').then(r => setList(r.data)); }, [user]);

    const save = async (e) => {
        e.preventDefault();
        const p = { title: e.target.title.value, price: e.target.price.value, category: 'cat', description: 'desc' };
        const { data } = await api.post('/products', p);
        setList([...list, data]);
        setShowForm(false);
    };

    if (!user) return <h1>Please login</h1>;

    return (
        <div>
            <h2>Products</h2>
            {(user.role === 'seller' || user.role === 'admin') && <button onClick={() => setShowForm(true)}>Add</button>}
            {showForm && (
                <form onSubmit={save}>
                    <input name="title" placeholder="Title" />
                    <input name="price" placeholder="Price" />
                    <button>Save</button>
                </form>
            )}
            <ul>
                {list.map(p => (
                    <li key={p.id}>
                        <Link to={`/products/${p.id}`}>{p.title}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const UserList = () => {
    const [users, setUsers] = useState([]);
    useEffect(() => { api.get('/users').then(r => setUsers(r.data)); }, []);
    const block = (id) => api.delete(`/users/${id}`).then(() => setUsers(users.map(u => u.id === id ? {...u, isBlocked: true} : u)));
    return (
        <div>
            <h2>Admin: User Management</h2>
            {users.map(u => (
                <div key={u.id}>
                    {u.email} ({u.role}) {u.isBlocked ? '[BLOCKED]' : <button onClick={() => block(u.id)}>Block</button>}
                </div>
            ))}
        </div>
    );
};

const ProductView = ({ user }) => {
    const { id } = useParams();
    const [p, setP] = useState(null);
    const navigate = useNavigate();
    useEffect(() => { api.get(`/products/${id}`).then(r => setP(r.data)); }, [id]);
    const del = () => api.delete(`/products/${id}`).then(() => navigate('/'));
    if (!p) return null;
    return (
        <div>
            <h1>{p.title}</h1>
            <p>{p.price} rub.</p>
            {user?.role === 'admin' && <button onClick={del}>Delete Product</button>}
        </div>
    );
};

export default App;