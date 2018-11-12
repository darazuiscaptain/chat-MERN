// dependencies
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID

const URI_TO_CONNECT_MONGODB = "mongodb+srv://root:root123@anijitsmongo-mwm6l.mongodb.net/allapps";
const DB_NAME = "allapps"
const COLLECTION_USERS = "users"
const COLLECTION_ROOMS = "rooms"

// this function will connect db and based on API send response
let connectDbAndRunQueries = async (apiName, req, res) => {
	try {
		let client = await MongoClient.connect(URI_TO_CONNECT_MONGODB, { useNewUrlParser: true })
		// select the db, Collections are selected based on needs
		const db = client.db(DB_NAME)

		// default output
		const output = { "message": "SUCCESS" }

		// perform several db actions based on API names
		chooseApiAndSendResponse(apiName, db, req, res, client, output)
	} catch (err) {
		console.log('Some Error occurred ...', err)
	}
}

// choose the particular function for an API and process it
let chooseApiAndSendResponse = (apiName, db, req, res, client, output) => {

	// perform db specific ops based on API names
	switch (apiName) {
		case 'login':
			makeLogin(db, req, res, client, output)
			break;
		case 'getRooms':
			makeGetRooms(db, req, res, client, output)
			break;
		case 'getConversation':
			makeGetConversation(db, req, res, client, output)
			break;
		case 'updateRoom':
			makeUpdateRoom(db, req, res, client, output)
			break;
	}
}

// handle request for /login API
let makeLogin = async (db, req, res, client, output) => {
	try {
		let { username, password } = req.body

		let docs = await db
			.collection(COLLECTION_USERS)
			.find({ username, password }, { projection: { "password": 0 } })
			.toArray()

		// rename necessary fields
		docs.map((doc) => {
			doc.userId = doc._id
			doc.name = doc.fullName.substring(0, doc.fullName.indexOf(' '))
			delete doc._id
			delete doc.fullName
		})

		// if the user exists or sends FAILED message
		output = (docs.length > 0) ? { ...docs[0] } : { "message": "FAILED" }
		sendOutputAndCloseConnection(client, output, res)
	} catch (err) {
		sendOutputAndCloseConnection(client)
	}
}


// /getrooms API
let makeGetRooms = async (db, req, res, client, output) => {

	let { rooms } = req.body
	roomIds = rooms.map((ele) => {
		return ObjectId(ele.roomId)
	})

	try {
		// db call
		let messages = await db
			.collection(COLLECTION_ROOMS)
			.find({ _id: { $in: roomIds } }, { projection: { "lastMessage": 1 } })
			.toArray()

		// if we get the data from the back end
		// console.log('Messages are', JSON.stringify(messages, null, '\t'))
		if (messages.length > 0) {
			output = []

			messages.forEach((ele, index) => {
				output.push({
					"roomname": rooms[index].roomName,
					"roomId": ele._id,
					"lastMessage": (ele.lastMessage) ? ele.lastMessage.msgBody : [],
					"dateInfo": (ele.lastMessage) ? ele.lastMessage.timeSent : 'NA',
					"senderId": (ele.lastMessage) ? ele.lastMessage.senderId : 'NA'
				})
			});

		}
		sendOutputAndCloseConnection(client, output, res)
	} catch (err) {
		console.log('unable to get last message for a room', err)
		sendOutputAndCloseConnection(client, output, res)
	}
}

// /getconversation API
let makeGetConversation = async (db, req, res, client, output) => {
	let { id } = req.params

	try {
		// db call
		let data = await db
			.collection(COLLECTION_ROOMS)
			.find({ _id: ObjectId(id) }, { projection: { "messages": 1 } })
			.toArray()

		// copy the messages to the resulting output
		output = [...data[0].messages]

		// add the id field to each message
		output = output.map((ele, index) => {
			ele = { ...ele, ...{ "id": `${id}${index}` } }
			return ele
		})

		sendOutputAndCloseConnection(client, output, res)
	} catch (error) {
		console.log('Unable to get conversation for that room', error)
		sendOutputAndCloseConnection(client, output, res)
	}
}


let makeUpdateRoom = async (db, req, res, client, output) => {
	console.log('params received', req.params)
	console.log('body of the req', req.body)
	let allMessages = sortMessagesFromSocket(req.body)

	let { roomId } = req.body
	let message = { ...req.body }
	console.log('This is for Room', roomId)

	// How TO USE PUSH WITHIN UPDATE DEMO QUERY
	// let data = await db
	// 	.collection(COLLECTION_ROOMS)
	// 	.updateOne({ _id: ObjectId(roomId) }, { $set: { "lastMessage": message }, $push: { "messages": message } })

	try {

		// initialize the bulk
		let bulk = await db
			.collection(COLLECTION_ROOMS)
			.initializeOrderedBulkOp()

		let ops = []

		// put them all in ops Promises
		for (let i = 0; i < allMessages.length; i++) {
			ops.push(
				await bulk
					.find({ _id: ObjectId(allMessages[i].roomId) })
					.updateOne({ $set: { "lastMessage": allMessages[i] }, $push: { "messages": allMessages[i] } })
			)
		}

		// execute all of them in bulk
		let result = await bulk.execute()

		console.log('Modified docs: ', result.nModified)
		sendOutputAndCloseConnection(client, output, res)
	} catch (error) {
		console.log('Unable to update rooms with messages', error)
	}
}

function sendOutputAndCloseConnection(client, output, res) {
	if (output && res) {
		console.log(`========================\nOUTPUT AS RECEIVED AND BEFORE SENDING\n==================\n`, output)
		res.json(output)
	}

	// close the database connection after sending the response
	client.close()
}

let sortMessagesFromSocket = (body) => {

	let allMessages = [
		{
			"msgBody": "test message for Ajitesh",
			"timeSent": "2018-09-13T15:24:43.657Z",
			"senderId": "adejhq87276",
			"roomId": "5be2d2031c9d4400004e51f2",
			"id": "6518xatei0"
		},
		{
			"msgBody": "Bulk test for JEET",
			"timeSent": "2018-10-23T05:24:43.657Z",
			"senderId": "adejhq876",
			"roomId": "5be2d3fc1c9d4400004e51f3",
			"id": "6518xatei0"
		}
	]

	// push the message comes from the socket
	if (body) {
		allMessages = [...allMessages, { ...body }]
	}

	allMessages = allMessages.sort((a, b) => { return new Date(a.timeSent) - new Date(b.timeSent) })
	console.log('All messages to be inserted in the DB', allMessages)
	return allMessages
}
// exports
module.exports = {
	connectDbAndRunQueries
}