const User = require('../model/userModel');
const Address = require('../model/addressModel');

const addAddress = async (req, res) => {
    try {
        const user_id = req.session.user_id
        const userdata = {
            fullName: req.body.name,
            mobile: req.body.mobile,
            email: req.body.email,
            houseName: req.body.houseName,
            state: req.body.state,
            city: req.body.city,
            pin: req.body.pincode,
        }
        const address = await Address.findOneAndUpdate(
            { user: user_id },
            { $push: { address: userdata } }, 
            { upsert: true, new: true }
        );
      res.json({addressAdded:true})
    } catch (e) {
        console.log('while adding address', e);
        res.status(200).render("error") 

    }
}
const editAddress = async (req, res) => {
    try {
        console.log("entered edit adress")
       const updated = await Address.findOneAndUpdate(
            { user: req.session.user_id, 'address._id': req.body.editAddressId },
            {
                $set: {
                    'address.$.fullName': req.body.fullname,
                    'address.$.email': req.body.email,
                    'address.$.mobile': req.body.mobile,
                    'address.$.houseName': req.body.houseName,
                    'address.$.city': req.body.city,
                    'address.$.state': req.body.state,
                    'address.$.pin': req.body.pincode, 
                },
            },
            { new: true }
        );
        console.log("error at edit adress")
        res.json({ success: true, message: 'Address edited!', address: updated });
    } catch (error) {
        console.log('Error while editing address', error.message);
        res.status(200).render("error")
    }
};
const deleteAddress = async(req,res)=>{
    try {
      
       const user_id=req.session.user_id
       const address_id = req.body.id
      await Address.updateOne({user:user_id},{$pull:{address:{_id:address_id}}})
  
      res.json({success:true})
  
    } catch (error) {
        console.log('while deleting address', e);
        res.status(200).render("error") 

    }
  }




module.exports = {
    addAddress,
    deleteAddress,
    editAddress
};
