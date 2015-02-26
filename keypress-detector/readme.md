# KeyPress Detector

The KeyPress Detector takes a stream of datapoints and finds strings of datapoints which represent key presses.

## Config Documentation

- **trailLength:** The length of the data stream trail in front of before and after key presses. Both the learner and the
                   detector use this value in order to know how many datapoints should be looked at at once.
                   **NB:** If this value is changed, you *must* run learner.js again!
- **trailAcceptanceThreshold:** A threshold of sensor change required in order to include a trail of datapoints in the
                                keypress training data set.
- **firstResponseThreshold:** A lot (or even all) test data has an initial period of null datapoints in the stream, due to
                              the client JS initialising in the first second of running. In order to differentiate between
                              valid data with this small initial null period and invalid data, where sensors have been
                              correctly recorded, this value represents the number of milliseconds to ignore null datapoints
                              for before the data is viewed as invalid.
                              **NB:** Note that one test case took over a second to begin delivering sensor values, it is
                                      suggested that at least 1250 milliseconds are allowed before kicking datasets out.
- **sensorRanges:** An object containing the properties for each sensor being considered in learning (currently oBeta, oGamma
                    aZY), with an numerical value representing the range of valid values for this sensor.
                    **NB:** The default config entry for the acceleration sensor is 20m/s. While accelerations can range far
                            greater than this value, these are usually in special conditions such as during acceleration in
                            space rockets, super cars and high-g roller coasters, all of which would probably not be suitable
                            environments to take readings for this detector anyway.
- **sensorWeights:** An object containing the properties for each sensor being considered in learning (currently oBeta, oGamma
                     aZY), with a numerical value representing the weight the sensor should have on the certainty of the
                     system. These values may add up to anything, but for readability's sake, it is easiest if they add up to
                     a power of 1, for instance {"w": 0.25, "x": 0.25, "y": 0.25, "z": 0.25} would represent equal weighting.
- **progressionThreshold:** The activation shown by the neural network in order for the detector to continue considering a set
                            of datapoints as a keypress.