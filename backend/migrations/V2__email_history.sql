-- A Table containing the history of each email send from the platform. This is used for auditing and debugging purposes.
CREATE TABLE rental.email_history (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    message_id VARCHAR(255), -- The unique message ID returned by the email service provider
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL, -- e.g. 'booking_confirmation', 'password_reset'
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- e.g. 'sent', 'failed'
    error_message TEXT -- if status is 'failed', this will contain the error message
);