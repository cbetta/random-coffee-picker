const csvtojson = require('csvtojson')
const shuffle = require('shuffle-array')
const split = require('split-array')
const jsontocsv = require('jsonexport')
const fs = require('fs')

const start = async () => {
  const filename = process.argv[2]
  const raw = await csvtojson().fromFile(filename)
  const pickId = id(raw)
  const people = await parse(raw)
  const matches = match(people)
  print(raw, matches, pickId, filename)
}

// Parse a file and wrap it into a set of name and previous matches
const parse = async (raw) => {
  // start with an empty array
  const data = []
  raw.forEach(entry => {
    // store the name and previous matches
    data.push({
      name: entry['Name'],
      matches: Object.values(entry)
        // ignore their own name
        .slice(1)
        // ignore empty matches
        .filter(entry => entry.length !== 0)
    })
  })
  return data
}

// Match the current set of people
const match = (people) => {
  // deep clone before we start shuffling
  people = [...people]
  // Start off with an invalid set
  let valid = false

  // Run as often as needed
  while (!valid) {
    // shuffle the list
    people = shuffle(people)
    // spit the list in two
    const [left, right] = split(people, Math.floor(people.length/2)) 
    // check if the list is valid
    valid = validate(left, right)
    // if not valid, we retry
    if (!valid) { process.stdout.write('.')  }
    else {
      // otherwise we return a list of matches
      return left.map((entry, index) => [entry.name, right[index].name])
    }
  }
}

// validates that the left and right haven't been matched before
const validate = (left, right) => 
  left.every((entry, index) => !right[index].matches.includes(entry.name))


// Prints the list back to the csv
const print = (raw, matches, pickId, filename) => {
  console.dir(matches)

  matches.forEach(([left, right]) => {
    raw.forEach(row => {
      if (row.Name === left) {
        row['Pick #'+pickId] = right
      } else if (row.Name === right) {
        row['Pick #'+pickId] = left
      }
    })
  })

  jsontocsv(matches, (_, data) => {
    fs.writeFileSync('pick.csv', data.replace(/;/g, ','))
  })
  
  jsontocsv(raw, (_, data) => {
    fs.writeFileSync(filename, data)
    console.log('\nDone')
  })
}

// Determines the current Pick ID.
const id = (raw) => {
  return Number(Object.keys(raw[0]).reverse()[0].split('#').reverse()[0])+1
}

start()