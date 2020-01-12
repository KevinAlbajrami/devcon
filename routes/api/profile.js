const express= require('express');
const router = express.Router();
const auth=require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post =require('../../models/Post');
const {check, validationResult} = require('express-validator');
const request = require('request');
const config = require('config');


//@route    GET api/profile/me
//@desc     Get current users profile
//@access   Private
router.get('/me', auth, async (req, res,next) => {
    try {
      const profile = await Profile.findOne({ user: res.user.id }).populate(
        'user',
        ['name', 'avatar']
      );
  
      if (!profile) {
        return res.status(400).json({ msg: 'There is no profile for this user' });
      }
  
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
//@route    GET api/profile
//@desc     Create or update a user profile
//@access   Private

router.post('/',[auth,[
    check('status','Status is required').not().isEmpty(),
    check('skills','skills is requires').not().isEmpty()
    ]
],
async(req,res,next)=>{
    const errors= validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    const{
        company,
        website,
        location,
        bio,
        status,
        githubUsername,
        skills,
        youtube,
        facebook,
        twitter,
        instagram,
        linkedin
    } = req.body;

    //build profile object
    const profileFields={};
    profileFields.user=res.user.id;
    if(company) profileFields.company=company;
    if(website) profileFields.website=website;
    if(location) profileFields.location=location;
    if(bio) profileFields.bio=bio;
    if(status) profileFields.status=status;
    if(githubUsername) profileFields.githubUsername=githubUsername;
    if(skills){
        profileFields.skills=skills.split(',').map(skill=>skill.trim());

    }
    //build social array
    profileFields.social={}
    if(youtube) profileFields.social.youtube=youtube;
    if(twitter) profileFields.social.twitter=twitter;
    if(facebook) profileFields.social.facebook=facebook;
    if(instagram) profileFields.social.instagram=instagram;
    if(linkedin) profileFields.social.linkedin=linkedin;

    try{
        let profile= await Profile.findOneAndUpdate(
                {user: res.user.id},
                {$set:profileFields},
                {new:true, upsert:true}
            );
            
            res.json(profile);
        
    }catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}
);
//@route    GET api/profile
//@desc     Get all profiles
//@access   Public
router.get('/',async(req,res)=>{
    try{
        const profiles = await Profile.find().populate('user',['name','avatar']);
        res.json(profiles);
    }catch(err){
        console.error(err.message);
        res.sendStatus(500).send('Server Error');
    }
});
//@route    GET api/profiles/user/:user_id
//@desc     Get profil by user_id
//@access   Public
router.get('/user/:user_id',async(req,res)=>{
    try{
        const profile = await Profile.findOne({user:req.params.user_id}).populate('user',['name','avatar']);
        res.json(profile);
        if(!profile) return res.status(400).json({msg:"Profile not found"});
        res.json(profile);
    }catch(err){
        console.error(err.message);
        if(err.kind=='ObjectId') {
            return res.status(400).json({msg:"Profile not found"});
        }
        res.send(500).send('Server Error');
    }
});
//@route    DELETE api/profile
//@desc     Delete profile/user/post
//@access   Private
router.delete('/',auth,async(req,res)=>{
    try{
        //Remove user posts
        await Post.deleteMany({user:res.user.id});
        
        
        //remove profile
        await Profile.findOneAndRemove({user:res.user.id});
        //remove user
        await User.findOneAndRemove({_id:res.user.id});
        res.json({msg: 'User removed'});
    }catch(err){
        console.error(err.message);
        res.send(500).send('Server Error');
    }
});
//@route    PUT api/profile/experience
//@desc     Add profile experience
//@access   Private
router.put('/experience',[auth,[
    check('title','Title is requires').not().isEmpty(),
    check('company','Company is requires').not().isEmpty(),
    check('from','From date is requires').not().isEmpty()
]],async(req,res)=>{
    const errors =validationResult(req);
    if(!errors.isEmpty()){
        return res.send(400).json({errors: errors.array()});
    }
    const{
        title,
        company,
        location,
        from,
        to,
        current,
        description} = req.body;
    const newExp= {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    };
    try{
        const profile = await Profile.findOne({user: res.user.id});
        profile.experience.unshift(newExp);
        await profile.save();
        res.json(profile);
    }catch(err){
        console.log(err.message);
        res.status(500).send('server error');
    }
})
//@route    DELETE api/profile/experience/:exp_id
//@desc     Delete experience from profile
//@access   Private
router.delete('/experience/:exp_id',auth,async(req,res)=>{
    try {
        const profile= await Profile.findOne({user:res.user.id});

        //Get remove index
        const removeIndex= profile.experience.map(item=>item.id).indexOf(req.params.exp_id);
        
        profile.experience.splice(removeIndex,1);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
})
//@route    PUT api/profile/education
//@desc     Add profile education
//@access   Private
router.put(
    '/education',
    [
      auth,
      [
        check('school', 'School is required')
          .not()
          .isEmpty(),
        check('degree', 'Degree is required')
          .not()
          .isEmpty(),
        check('fieldofStudy', 'Field of study is required')
          .not()
          .isEmpty(),
        check('from', 'From date is required')
          .not()
          .isEmpty()
      ]
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const {
        school,
        degree,
        fieldofStudy,
        from,
        to,
        current,
        description
      } = req.body;
  
      const newEdu = {
        school,
        degree,
        fieldofStudy,
        from,
        to,
        current,
        description
      };
  
      try {
        const profile = await Profile.findOne({ user: res.user.id });
  
        profile.education.unshift(newEdu);
  
        await profile.save();
  
        res.json(profile);
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  );
//@route    DELETE api/profile/education/:edu_id
//@desc     Delete education from profile
//@access   Private
router.delete('/education/:edu_id',auth,async(req,res)=>{
    try {
        const profile= await Profile.findOne({user:res.user.id});

        //Get remove index
        const removeIndex= profile.education.map(item=>item.id).indexOf(req.params.edu_id);
        
        profile.education.splice(removeIndex,1);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});
//@route    Get api/profile/github/:username
//@desc     Get user repos from github
//@access   Public

router.get('/github/:username', (req,res)=>{
    try {
        const options={
            uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
            method: 'GET',
            header:{'user-agent':'node.js'}        
        }
        request(options,(error,response,body)=>{
            if(error) console.error(error);
            if(response.statusCode!==200){
                res.status(404).json({msg:"No Github profile found"});
            }
            res.json(JSON.parse(body));
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");    
    }
})
module.exports=router;