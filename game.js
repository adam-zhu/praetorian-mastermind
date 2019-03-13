const fetch = require("node-fetch");
const email = "adam@adamz.hu";
const urlBase = "https://mastermind.praetorian.com";
const tokenEndpoint = urlBase + "/api-auth-token/";
const levelEndpoint = lvl => urlBase + "/level/" + lvl + "/";
const resetEndpoint = urlBase + "/reset/";
const hashEndpoint = urlBase + "/hash/";
const range = i => Array.from(new Array(i).keys());
const shuffled = array => {
  const shuffledArray = [...array];
  let currentIndex = shuffledArray.length;
  let temporaryValue, randomIndex;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = shuffledArray[currentIndex];
    shuffledArray[currentIndex] = shuffledArray[randomIndex];
    shuffledArray[randomIndex] = temporaryValue;
  }

  return shuffledArray;
};
const getToken = email =>
  fetch(tokenEndpoint, {
    method: "post",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(data => {
      return data["Auth-Token"];
    })
    .catch(e => {
      console.error(e);
    });
const getLevel = ({ token, level }) =>
  fetch(levelEndpoint(level), {
    headers: { "Content-Type": "application/json", "Auth-Token": token }
  })
    .then(res => res.json())
    .then(data => {
      return data;
    })
    .catch(e => {
      console.error(e);
    });
const postGuess = ({ guess, level, token }) => {
  return fetch(levelEndpoint(level), {
    method: "post",
    body: JSON.stringify({ guess }),
    headers: { "Content-Type": "application/json", "Auth-Token": token }
  })
    .then(res => res.json())
    .then(data => {
      return data;
    })
    .catch(e => {
      console.error(e);
    });
};
const getHash = ({ token }) =>
  fetch(hashEndpoint, {
    method: "get",
    headers: { "Content-Type": "application/json", "Auth-Token": token }
  })
    .then(res => res.json())
    .then(data => {
      return data["hash"];
    })
    .catch(e => {
      console.error(e);
    });
const postReset = ({ token }) =>
  fetch(resetEndpoint, {
    method: "post",
    headers: { "Content-Type": "application/json", "Auth-Token": token }
  })
    .then(res => res.json())
    .then(data => {
      return data;
    })
    .catch(e => {
      console.error(e);
    });

let state = {
  reset: false,
  token: null,
  level: 1,
  levelFetched: false,
  guesses: [],
  weapons: null,
  numGladiators: null,
  numGuesses: null,
  numRounds: null,
  numWeapons: null,
  roundsLeft: null,
  hash: null
};

const handleGuessResponse = guess => async data => {
  if (data["response"]) {
    state = {
      ...state,
      guesses: state.guesses.concat({ guess, response: data["response"] })
    };

    console.log(`Guess #${state.guesses.length}`);
    console.log(guess, data["response"]);
  }

  if (data["roundsLeft"]) {
    const { numGladiators, numWeapons, numGuesses, numRounds } = data;

    console.log("Round won.");
    console.log("Rounds left: ", numRounds);

    state = {
      ...state,
      numGladiators,
      numWeapons,
      numGuesses,
      numRounds
    };
  }

  if (data["hash"]) {
    state = {
      ...state,
      hash: data["hash"]
    };
  }

  if (data["message"] && data["message"] === "Onto the next level") {
    console.log("Level " + state.level + " won.");
    console.log("Winning guess: ", guess);
    console.log(data);

    const hash = await getHash(state);

    if (hash) {
      state = {
        ...state,
        hash: data["hash"]
      };
    } else {
      state = {
        ...state,
        level: state.level + 1,
        levelFetched: false
      };
    }
  }

  if (data["error"]) {
    state = {
      ...state,
      levelFetched: false
    };
  }
};

const playGame = async () => {
  if (!state.token) {
    const token = await getToken(email);

    state = {
      ...state,
      token
    };
  }

  if (state.reset) {
    await postReset(state);

    state = {
      ...state,
      level: 1,
      levelFetched: false,
      reset: false
    };
  }

  if (!state.levelFetched) {
    const { numGladiators, numWeapons, numGuesses, numRounds } = await getLevel(
      state
    );

    state = {
      ...state,
      levelFetched: true,
      weapons: range(numWeapons),
      guesses: [],
      numGladiators,
      numWeapons,
      numGuesses,
      numRounds
    };

    console.groupEnd();
    console.group("\n\n@@@ LEVEL " + state.level + " @@@");
    console.log({ numGladiators, numWeapons, numGuesses, numRounds });
    console.log(
      "================================================================"
    );
  }

  const guess = shuffled(state.weapons).slice(0, state.numGladiators);
  const response = await postGuess({
    guess,
    level: state.level,
    token: state.token
  });

  await handleGuessResponse(guess)(response);

  if (state.hash) {
    console.log("Game won: ", state.hash);
  } else {
    playGame();
  }
};

playGame();
