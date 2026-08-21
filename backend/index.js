require('dotenv').config();
const express = require('express');
const fileUpload = require("express-fileupload");
const cors = require('cors');
const bolaKunRoutes = require('./routes/bola_kun');
const bolaKunAllRoutes = require('./routes/bola_kuni_all');

const adminRoutes = require('./routes/adminRoutes')
const lavozimRoutes = require('./routes/lavozimRoutes');
const xodimRoutes = require('./routes/xodimRoutes');
const jarimaRoutes = require('./routes/jarimaRoutes');
const bonusRoutes = require('./routes/bonusRoutes');
const kunlikRoutes = require('./routes/kunlikRoutes');
const oylikTypeRoutes = require('./routes/oylikTypeRoutes');
const skladProductRoutes = require('./routes/skladProductRoutes');
const skladProductTakticRoutes = require('./routes/skladProductTakticRoutes');
const guruhRoutes = require('./routes/guruhRoutes');
const chiqimMaishiyRouter = require('./routes/chiqimMaishiy');
const bolaRoutes = require('./routes/bolaRoutes');
const skladMaishiyRouter = require('./routes/skladMaishiy');
const kirimMaishiyRouter = require('./routes/kirimMaishiy');
const darssanaRoutes = require('./routes/darssana');
const chiqimOmborRouter = require('./routes/chiqimOmbor');
const chiqimQoshimchaRouter = require('./routes/chiqimQoshimcha');
const taomRoutes = require('./routes/taom');
const taom_ingredientRoutes = require('./routes/taom_ingredient');
const daromatTypeRoutes = require('./routes/daromat_type');
const permissionRoutes = require('./routes/permissionRoutes');
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(fileUpload());
app.use(express.json());
app.use(express.static('./uploads'));

// Routers
app.use('/admin', adminRoutes);

app.use('/lavozim', lavozimRoutes);
app.use('/xodim', xodimRoutes);
app.use('/jarima', jarimaRoutes);
app.use('/bonus', bonusRoutes);
app.use('/kunlik', kunlikRoutes);
app.use('/oylik_type', oylikTypeRoutes);
app.use('/sklad_product', skladProductRoutes);
app.use('/sklad_product_taktic', skladProductTakticRoutes);
app.use('/guruh', guruhRoutes);
app.use('/bola', bolaRoutes);
app.use('/chiqim_maishiy', chiqimMaishiyRouter);
app.use('/sklad_maishiy', skladMaishiyRouter);
app.use('/kirim_maishiy', kirimMaishiyRouter);
app.use('/chiqim_ombor', chiqimOmborRouter);
app.use('/chiqim_qoshimcha', chiqimQoshimchaRouter);
app.use('/bola_kun', bolaKunRoutes);
app.use('/bola_kun_all', bolaKunAllRoutes);

app.use('/darssana', darssanaRoutes);
app.use('/taom', taomRoutes);
app.use('/taom_ingredient', taom_ingredientRoutes);
app.use('/daromat_type', daromatTypeRoutes);
app.use('/permissions', permissionRoutes);
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Serverda xato yuz berdi', error: err.message });
});

// Serverni ishga tushirish
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
