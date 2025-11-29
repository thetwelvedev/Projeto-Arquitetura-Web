require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csurf = require('csurf'); // ← Middleware CSRF
const userController = require('./controllers/userController');
const isAuth = require('./middleware/auth');
const authController = require('./controllers/authController');

const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));

// --- Proteção de Headers
app.use(helmet());

// --- Sessão
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// --- CSRF (obrigatoriamente após sessão)
app.use(csurf());

// --- Enviar token CSRF para TODAS as views
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken(); // ← agora csrfToken está disponível no EJS
    next();
});

// --- Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🔥 Conectado ao MongoDB Atlas!'))
  .catch(err => console.error('Erro ao conectar no Mongo:', err));

// --- Rate Limiter Login
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'limite_brute_force' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Rotas Públicas
app.get('/login', (req, res) => {
    let mensagemErro = req.query.erro;
    if (mensagemErro === 'limite_brute_force') {
        mensagemErro = 'Muitas tentativas de login. Aguarde 1 minuto.';
    }
    res.render('login', { erro: mensagemErro, sucesso: req.query.sucesso });
});

// ❗ LOGIN NÃO TEM CSRF (caso especial)
app.post('/login', loginLimiter, authController.login);

app.get('/register', authController.getRegisterForm);

// ✔ Register deve ter CSRF
app.post('/register', authController.registerUser);

// --- Rotas Protegidas
app.get('/', (req, res) => res.redirect('/users'));
app.get('/users', isAuth, userController.getAllUsers);
app.get('/users/new', isAuth, userController.getNewUserForm);
app.post('/users/delete/:id', isAuth, userController.deleteUser);
app.get('/users/edit/:id', isAuth, userController.getEditUserForm);
app.post('/users/update/:id', isAuth, userController.updateUser);

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
