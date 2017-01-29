# Switch ETEKCITY Zap outlet on an off via 433 hrtz transmitter.

codes = [ 
	{ on: 283955, off: 283964 },
	{ on: 284099, off: 284108 },
	{ on: 284419, off: 284428 },
	{ on: 285955, off: 285964 },
	{ on: 292099, off: 292108 }]


if __name__ == '__main__':
    import sys

    if len(sys.argv) == 1:
        print 'Usage: %s switchnum state'

	switchnum = sys.argv[1]
    state = sys.argv[2]

	import pi_switch
	sender = pi_switch.RCSwitchSender()
	sender.setProtocol(1)
	sender.setPulseLength(189)
	sender.setRepeatTransmit(5)

	sender.enableTransmit(17) # use WiringPi pin 17
	sender.sendDecimal(codes[switchnum-1][state], 24) # switch state
