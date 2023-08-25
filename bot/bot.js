/*
 * Bot
 * This example shows how you can automatically respond to incoming messages.
 */

const _ = require('lodash');
// const js8 = require('../app')();
// Outside this example, this line would normally be:
//const js8 = require('@trippnology/lib-js8call')();
const js8 = require('@trippnology/lib-js8call')({
	debug: true,
	tcp: { host: '127.0.0.1', port: 2446 },
});


let config = {
	my_call: 'KK7CXF',
};

// Some example commands
let commands = {
	// When we see the word 'BEEP', we respond with 'BOOP'
	BEEP: (data) => {
		// You could respond with data from a local file, a web API, etc. or
		// trigger a relay, turn on a light, move a rotator.
		// This is a very simple example but the only limit is your imagination.
		return js8.tx.sendMessage(data.raw.params.FROM + ' BOOP');
	},
	// Do something with one of the built in keywords. This could be stored to a DB etc.
	HEARTBEAT: (data) => {
		console.log('[HB] %s %s', data.raw.params.FROM, data.raw.params.EXTRA);
	},
};

// Parses an incoming packet and decorates it with extra properties
function parsePacket(packet) {
	// Trim from, to, and the stop character, to leave just the message content
	let trimmed = _.chain(packet.value)
		.replace(packet.params.FROM + ':', '')
		.replace(config.my_call, '')
		.replace('♢', '')
		.trim()
		.value();
	// Split the message into individual words
	let words = _.words(trimmed);
	// Send back the parsed text, words, and the original packet, as commands may need them all.
	return { message: trimmed, raw: packet, words: words };
}

// Returns true if the supplied word is a valid command name
function isValidCommand(word) {
	// The key names are used for the command names
	let command_names = Object.keys(commands);
	return _.includes(command_names, word);
}

// Checks incoming messages for valid commands
function runCommands(packet) {
	// Parse the incoming message to strip away callsigns etc
	let data = parsePacket(packet);
	// We're using the first word as the command
	let command_name = data.words[0];

	if (isValidCommand(command_name)) {
		console.log(
			'[Command] ' + command_name + ' from ' + packet.params.FROM
		);
		// We're dealing with user input here, so anything could happen
		try {
			commands[command_name](data);
		} catch (error) {
			console.log('[Error] %s command failed.', command_name);
			console.log('------- Source packet:', packet);
			console.error(error);
		}
	}
}

js8.on('tcp.connected', (connection) => {
	console.log(
		'Server listening %s:%s Mode: %s',
		connection.address,
		connection.port,
		connection.mode
	);
});

js8.on('ping', (packet) => {
	console.log('[Ping] %s v%s', packet.params.NAME, packet.params.VERSION);
});

js8.on('rig.ptt', (packet) => {
	console.log('[Rig] PTT %s', packet.value);
});

js8.on('rx.directed.to_me', (packet) => {
	console.log('[Message to me] %s', packet.value);
	// Check the message for valid commands
	runCommands(packet);
});

js8.on('station.callsign', (packet) => {
	console.log('Station Callsign: %s', packet.value);
	// We need to keep a note of our call so we can strip it from messages.
	// lib-js8call issues a station.getMetadata() command at startup
	// so we should see one of these events right after the tcp.connected event
	config.my_call = packet.value;
});
