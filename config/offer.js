const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');


const checkAllOffer = async (product) => {
    const categoryOffer = await CategoryOffer.findOne({ category: product.category });
    const productOffer = await ProductOffer.findOne({ product: product._id });

    const originalPrice = product.price;

    let categoryDiscountedPrice = originalPrice;
    let productDiscountedPrice = originalPrice;

    if (categoryOffer) {
        categoryDiscountedPrice = calculateDiscountedPrice(originalPrice, categoryOffer.discountPercentage);
    }

    if (productOffer) {
        productDiscountedPrice = calculateDiscountedPrice(originalPrice, productOffer.discountPercentage);
    }

    return Math.min(categoryDiscountedPrice, productDiscountedPrice);
};

const calculateDiscountedPrice = (originalPrice, discountValue) => {
    return originalPrice - (originalPrice * discountValue) / 100; // For percentage-based discount
};



module.exports = { checkAllOffer };
