const urlModel = require("../models/urlModel")
const shortid = require("shortid");
const validUrl = require("valid-url");


// .............................REDIS...............................................................


const redis = require("redis");
const { promisify } = require("util");




//..........................Connect to redis..............................................


const redisClient = redis.createClient(
    16368,
    "redis-16368.c15.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);


redisClient.auth("Y52LH5DG1XbiVCkNC2G65MvOFswvQCRQ", function (err) {
    if (err) throw err;
});


redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});


//...................................validation.........................................................


const isValid = function (value) {
    if (typeof value === undefined || typeof value === null) return false
    if (typeof value === "string" && value.trim().length > 0) return true
}


const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


// ................................Create short Url......................................................


const urlShortener = async function (req, res) {


    const baseUrl = 'http://localhost:3000'

    const data = req.body

    if (Object.keys(data) == 0) {
        return res.status(400).send({ status: false, message: "Please provide Data" })
    }

    const longUrl = req.body.longUrl;

    if (!isValid(longUrl)) {
        return res.status(400).send({ status: false, message: "Please provide URL" })
    }

    if (!validUrl.isUri(longUrl)) {
        return res.status(400).send({ status: false, message: "Please provide valid Url" })
    }


    if (validUrl.isUri(longUrl)) {

        try {

            let cachedData = await GET_ASYNC(`${longUrl}`)

            if (cachedData) {

                let newpParseData = JSON.parse(cachedData)

                return res.status(200).send(newpParseData)
            }

           

            const url = await urlModel.findOne({ longUrl: longUrl }).select({ _id: 0, __v: 0 })


            if (url) {
                await SET_ASYNC(`${longUrl}`, JSON.stringify(url))
                return res.status(201).send({ status: true, data: url });
            } else {

                const urlGenerated = shortid.generate()

                const urlCode = urlGenerated.trim().toLowerCase()


                const shortUrl = baseUrl + "/" + urlCode


                const newurl = ({                     //key value pair
                    longUrl: longUrl,
                    shortUrl: shortUrl,
                    urlCode: urlCode,

                });

                const urlData = await urlModel.create(newurl)


                return res.status(201).send({ status: true, data: urlData });
            }
        } catch (err) {
            console.log(err)
            return res.status(500).send({ Error: err.message });
        }
    }
};

// .................................Get Url.....................................................


const geturl = async function (req, res) {

    try {

        const urlCode = req.params.urlCode;

        let cacheData = await GET_ASYNC(`${urlCode}`)

        if (cacheData) { return res.status(302).redirect(JSON.parse(cacheData)) }

        const URL = await urlModel.findOne({ urlCode: urlCode })

        if (!URL) { return res.status(404).send({ status: false, message: 'No such Url found' }) }

        await SET_ASYNC(`${urlCode}`, JSON.stringify(URL.longUrl));

        return res.status(302).redirect(URL.longUrl);

    }

    catch (error) {

        console.log(error)
        return res.status(500).send({ message: error.message })
    }
}


module.exports = { urlShortener, geturl }