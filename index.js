'use strict';
const https = require('https');

exports.handler = (event, context, callback) => {
    console.log("Event : " + JSON.stringify(event));
    const postData = buildPostData(event);
    if (postData !== '') {
        console.log("Ready to post" + JSON.stringify(postData));
        postToSlack(postData, context, callback)
    }
};

function buildPostData(event) {

    let source = '';
    if(Array.isArray(event.source)) {
       source = event.source[0];
    } else {
        source = event.source;
    }

    switch (source) {
        case 'aws.codepipeline':
            return getPipelineNotification(event, getSlackChannel());
        case 'aws.ecs':
            return getECSNotification(event, getSlackChannel());
        case 'aws.emr':
            return getEMRNotification(event, getSlackChannel());
        case 'aws.lambda':
            return getLambdaNotification(event, getSlackChannel());
        case 'alert.notification':
            return getAlertNotification(event, getAlertSlackChannel());
    }
    console.log('Ignored event type : ' + event.source);
    return '';
}

function postToSlack(message, context, callback) {
    const data = JSON.stringify(message);

    const post_options = {
        host: 'hooks.slack.com',
        port: '443',
        path: getSlackPath(),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        }
    };

    const req = https.request(post_options, (res) => {
        let body = '';
        res.on('data', (d) => {
            body += d;
        });

        res.on('end', function () {
            callback(null, body);
        });
    });

    req.on('error', context.fail);

    req.write(data);
    req.end();
}

const getSlackPath = function () {
    return process.env.SLACK_PATH;
};
const getSlackChannel = function () {
    return process.env.SLACK_CHANNEL;
};

const getAlertSlackChannel = function () {
    return process.env.ALERT_SLACK_CHANNEL;
};

function isSuccessState(state) {
    return (state.includes('STARTED') || state.includes('SUCCEEDED') || state.includes('COMPLETED'));
}

function isInterestingEvent(event) {
    const stage = event.detail.stage;
    const state = event.detail.state;

    if (stage.includes('Deploy')) {
        return true;
    }

    if (!isSuccessState(state)) {
        return true;
    }

    console.log("Ignoring Event : " + JSON.stringify(event));
    return false
}

function getText(message) {
    let text = '';
    if (isSuccessState(message.detail.state)) {
        text = message.detail.stage + ' : ' + message.detail.state;
    } else {
        text = "Build failed at : " + message.detail.stage;
    }

    return text;
}

function getEMRText(message) {
    let text = '';
    let clusterIdElement = message.detail.clusterId[0];
    if (isSuccessState(message.detail.state)) {
        text = "cluster " + clusterIdElement + " has completed"
    } else {
        text = "cluster " + clusterIdElement + " has failed"
    }

    return text;
}

function getLambdaText(message) {
    let text = '';
    let clusterIdElement = message.detail.clusterId[0];
    if (isSuccessState(message.detail.state)) {
        text = "cluster " + clusterIdElement + " has completed"
    } else {
        text = "cluster " + clusterIdElement + " has failed"
    }

    return text;
}

function getAlertNotificationText(message) {
    return message.detail.message;
}


const getColor = function (state) {
    if (isSuccessState(state)) {
        return "#3fb836";
    }
    return "#b82004";
};

const getPipelineNotification = function (message, slackChannel) {
    if (!isInterestingEvent(message)) {
        console.log("Ignore event : " + message);
        return '';
    }

    return {
        "channel": slackChannel,
        "icon_url": "https://docs.aws.amazon.com/images/aws_logo_105x39.png",
        "username": "aws-codepipeline-webhook",
        "attachments": [
            {
                "text": getText(message),
                "color": getColor(message.detail.state),
                "fields": [
                    {
                        "title": "Pipeline",
                        "value": message.detail.pipeline,
                        "short": false
                    },
                    {
                        "title": "Stage",
                        "value": message.detail.stage,
                        "short": true
                    },
                    {
                        "title": "State",
                        "value": message.detail.state,
                        "short": true
                    }
                ]
            }
        ]
    };
};

const getECSNotification = function (message, slackChannel) {
    if (message.detail.desiredStatus !== message.detail.lastStatus) {
        console.log('Ignoring state change event');
        return '';
    }

    return {
        "channel": slackChannel,
        "icon_url": "https://docs.aws.amazon.com/images/aws_logo_105x39.png",
        "username": "AWS",
        "attachments": [
            {
                "text": "Task " + message.detail.containers[0].name + " has " + message.detail.lastStatus,
                "fields": [
                    {
                        "title": "Name",
                        "value": message.detail.containers[0].name,
                        "short": true
                    },
                    {
                        "title": "Status",
                        "value": message.detail.lastStatus,
                        "short": true
                    },
                    {
                        "title": "Time",
                        "value": message.time,
                        "short": true
                    },
                    {
                        "title": "Task",
                        "value": message.detail.taskDefinitionArn,
                        "short": false
                    },
                ]
            }
        ]
    };
};

const getEMRNotification = function (message, slackChannel) {
    console.log('This is EMR event');
    let state = message.detail.state[0];
    if ("FAILED" === state || "COMPLETED" === state) {
        return {
            "channel": slackChannel,
            "icon_url": "https://docs.aws.amazon.com/images/aws_logo_105x39.png",
            "username": "aws-emr",
            "attachments": [
                {
                    "text": getEMRText(message),
                    "color": getColor(state),
                    "fields": [
                        {
                            "title": "State",
                            "value": state,
                            "short": true
                        }
                    ]
                }
            ]
        };
    }
};

const getLambdaNotification = function (message, slackChannel) {
    if (!isInterestingEvent(message)) {
        console.log("Ignore event : " + message);
        return '';
    }

    console.log('This is Lambda event');
    return {
        "channel": slackChannel,
        "icon_url": "https://docs.aws.amazon.com/images/aws_logo_105x39.png",
        "username": "aws-lambda",
        "attachments": [
            {
                "text": getLambdaText(message),
                "color": getColor(message.detail.state),
                "fields": [
                    {
                        "title": "Lambda",
                        "value": message.detail.pipeline,
                        "short": false
                    },
                    {
                        "title": "Stage",
                        "value": message.detail.stage,
                        "short": true
                    },
                    {
                        "title": "State",
                        "value": message.detail.state,
                        "short": true
                    }
                ]
            }
        ]
    };
};

const getAlertNotification = function (message, slackChannel) {
    console.log('This is Alert event');
    return {
        "channel": slackChannel,
        "icon_url": "https://docs.aws.amazon.com/images/aws_logo_105x39.png",
        "username": "aws-alert-notification",
        "attachments": [
            {
                "text": getAlertNotificationText(message),
                "color": getColor(message.detail.message),
                "fields": [
                    {
                        "title": "Details",
                        "value": message.detail.details,
                        "short": false
                    },
                    {
                        "title": "Total Number",
                        "value": message.detail.number,
                        "short": false
                    },
                    {
                        "title": "Running Query",
                        "value": message.detail.sqlQuery,
                        "short": false
                    }
                ]
            }
        ]
    };
};
