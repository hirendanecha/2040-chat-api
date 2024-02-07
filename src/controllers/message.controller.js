const Message = require("../models/message.model");
const utils = require("../helpers/utils");
const { getPagination, getCount, getPaginationData } = require("../helpers/fn");

exports.getMessages = async (req, res) => {
  const { page, size, roomId, groupId } = req.body;
  const { limit, offset } = getPagination(page, size);
  const data = await Message.getMessages(limit, offset, roomId, groupId);
  return res.send(
    getPaginationData(
      { count: data.count, docs: data.messageList },
      page,
      limit
    )
  );
};

exports.getMembers = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { searchText } = req.query;
    const data = await Message.getMembers(groupId, searchText);
    return res.send({ data: data });
  } catch (error) {
    return res.status(500).send(error);
  }
};
