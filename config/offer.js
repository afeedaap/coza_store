const CategoryOffer = require('../model/categoryOfferModel');
const Product = require('../model/productModel');

const checkAllOffer = async (product) => {
    const categoryOffer = await CategoryOffer.findOne({ category: product.category });
    const productOffer = await Product.findOne({ product: product._id });
     return Math.max(categoryOffer.discountPercentage <productOffer.discount);
};

module.exports = { checkAllOffer };

