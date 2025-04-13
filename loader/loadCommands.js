const fs = require('fs')

module.exports = async bot => {

    fs.readdirSync('./commands').filter(f => f.endsWith('.js')).forEach(async files => {

        let command = require(`../commands/${files}`)
        if(!command.name || typeof command.name !== 'string') throw new Error(`La commande ${files.slice(0, files.length -3)} n'a pas de nom.`)
        bot.commands.set(command.name, command)
        console.log(`Commande ${files.slice(0, files.length - 3)} chargée avec succès.`)
    })
}