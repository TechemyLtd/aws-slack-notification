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
    switch (event.source) {
        case 'aws.codepipeline':
            return getPipelineNotification(event, getSlackChannel());
        case 'aws.ecs':
            return getECSNotification(event, getSlackChannel());
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

function isSuccessState(state) {
    return (state.includes('STARTED') || state.includes('SUCCEEDED'));
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
